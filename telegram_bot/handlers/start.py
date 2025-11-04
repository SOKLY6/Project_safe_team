from Project_safe_team.app.database import async_session
from Project_safe_team.app.models.organization import Organization
from Project_safe_team.app.models.user import User
from Project_safe_team.telegram_bot.keyboards.main_menu import (
    get_main_keyboard,
)
from sqlalchemy import select
from telegram import ReplyKeyboardMarkup, Update
from telegram.ext import (
    CommandHandler,
    ContextTypes,
    ConversationHandler,
    MessageHandler,
    filters,
)

WAITING_FOR_NAME, WAITING_FOR_ORG = range(2)


async def get_organizations_list():
    async with async_session() as session:
        result = await session.execute(select(Organization))
        orgs = result.scalars().all()
        return [org.name for org in orgs]


async def start_registration(
    update: Update, context: ContextTypes.DEFAULT_TYPE
):
    telegram_id = update.effective_user.id

    async with async_session() as session:
        result = await session.execute(
            select(User).filter(User.telegram_id == telegram_id)
        )
        existing_user = result.scalar_one_or_none()

        if existing_user:
            await update.message.reply_text(
                f'✅ Вы уже зарегистрированы как {existing_user.name}',
                reply_markup=get_main_keyboard(),
            )
            return ConversationHandler.END

    await update.message.reply_text(
        '🤖 Добро пожаловать в генератор QR-пропусков!\n'
        'Для начала работы пройдите регистрацию!\n'
        'Пожалуйста, введите ваше ФИО:'
    )
    return WAITING_FOR_NAME


async def save_name(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['name'] = update.message.text.strip()

    organizations = await get_organizations_list()

    if not organizations:
        await update.message.reply_text(
            '❌ В базе нет организаций. Обратитесь к администратору.'
        )
        return ConversationHandler.END

    await update.message.reply_text(
        'Выберите вашу организацию:',
        reply_markup=ReplyKeyboardMarkup(
            [[org] for org in organizations],
            one_time_keyboard=True,
            resize_keyboard=True,
        ),
    )
    return WAITING_FOR_ORG


async def check_user_in_database(name: str, organization_name: str):
    async with async_session() as session:
        org_result = await session.execute(
            select(Organization).filter(Organization.name == organization_name)
        )
        org = org_result.scalar_one_or_none()

        if not org:
            return False, None

        user_result = await session.execute(
            select(User).filter(
                User.name == name, User.organization_id == org.id
            )
        )
        user = user_result.scalar_one_or_none()

        return user is not None, org.id if org else None


async def save_organization_and_check(
    update: Update, context: ContextTypes.DEFAULT_TYPE
):
    org = update.message.text
    name = context.user_data.get('name')
    telegram_id = update.effective_user.id

    organizations = await get_organizations_list()

    if org not in organizations:
        await update.message.reply_text(
            'Пожалуйста, выберите организацию из списка!'
        )
        return WAITING_FOR_ORG

    context.user_data['organization'] = org

    user_exists, org_id = await check_user_in_database(name, org)

    if user_exists:
        async with async_session() as session:
            result = await session.execute(
                select(User).filter(
                    User.name == name, User.organization_id == org_id
                )
            )
            existing_user = result.scalar_one_or_none()

            if existing_user and not existing_user.telegram_id:
                existing_user.telegram_id = telegram_id
                await session.commit()

        await update.message.reply_text(
            f'✅ Спасибо, {name}!\nОрганизация: {org}\nРегистрация завершена.',
            reply_markup=get_main_keyboard(),
        )
        return ConversationHandler.END
    else:
        await update.message.reply_text(
            '❌ Не найдено совпадение ФИО или организации в базе.\n'
            'Попробуйте снова:\nВведите ФИО:'
        )
        return WAITING_FOR_NAME


async def cancel_registration(
    update: Update, context: ContextTypes.DEFAULT_TYPE
):
    await update.message.reply_text('Регистрация отменена.')
    return ConversationHandler.END


def setup_start_handlers(application):
    registration_handler = ConversationHandler(
        entry_points=[CommandHandler('start', start_registration)],
        states={
            WAITING_FOR_NAME: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, save_name)
            ],
            WAITING_FOR_ORG: [
                MessageHandler(
                    filters.TEXT & ~filters.COMMAND,
                    save_organization_and_check,
                )
            ],
        },
        fallbacks=[CommandHandler('cancel', cancel_registration)],
    )
    application.add_handler(registration_handler)
