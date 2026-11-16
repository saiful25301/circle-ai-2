"""initial_12_tables

Revision ID: 0001_initial_12_tables
Revises: None
Create Date: 2026-11-16 15:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0001_initial_12_tables'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False, server_default='agent'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_role', 'users', ['role'], unique=False)
    op.create_index('ix_users_is_active', 'users', ['is_active'], unique=False)

    # 2. agents
    op.create_table(
        'agents',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False, server_default='support_officer'),
        sa.Column('avatar', sa.String(length=50), nullable=False, server_default='NOC'),
        sa.Column('is_online', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('max_active_chats', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('active_chats_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('resolved_today_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_agents_user_id', 'agents', ['user_id'], unique=True)
    op.create_index('ix_agents_role', 'agents', ['role'], unique=False)
    op.create_index('ix_agents_is_online', 'agents', ['is_online'], unique=False)

    # 3. packages
    op.create_table(
        'packages',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('bandwidth_mbps', sa.Integer(), nullable=False),
        sa.Column('bdix_speed_mbps', sa.Integer(), nullable=False, server_default='100'),
        sa.Column('monthly_price_bdt', sa.Float(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_packages_name', 'packages', ['name'], unique=True)
    op.create_index('ix_packages_code', 'packages', ['code'], unique=True)
    op.create_index('ix_packages_is_active', 'packages', ['is_active'], unique=False)

    # 4. customers
    op.create_table(
        'customers',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('subscriber_id', sa.String(length=50), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=50), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('address', sa.String(length=500), nullable=True),
        sa.Column('zone', sa.String(length=100), nullable=True),
        sa.Column('package_id', sa.String(length=36), sa.ForeignKey('packages.id'), nullable=True),
        sa.Column('pppoe_username', sa.String(length=100), nullable=False),
        sa.Column('plan_name', sa.String(length=100), nullable=False, server_default='Circle Fast 30 Mbps'),
        sa.Column('bandwidth_mbps', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('monthly_bill_bdt', sa.Float(), nullable=False, server_default='800.0'),
        sa.Column('current_due_bdt', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('olt_ip', sa.String(length=50), nullable=False, server_default='10.200.14.2'),
        sa.Column('pon_port', sa.String(length=50), nullable=False, server_default='EPON0/2:4'),
        sa.Column('onu_mac', sa.String(length=50), nullable=False, server_default='E0:67:B3:91:AA:12'),
        sa.Column('optical_power_dbm', sa.Float(), nullable=False, server_default='-19.5'),
        sa.Column('connection_status', sa.String(length=50), nullable=False, server_default='online'),
        sa.Column('last_online_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_customers_subscriber_id', 'customers', ['subscriber_id'], unique=True)
    op.create_index('ix_customers_pppoe_username', 'customers', ['pppoe_username'], unique=True)
    op.create_index('ix_customers_phone', 'customers', ['phone'], unique=False)
    op.create_index('ix_customers_email', 'customers', ['email'], unique=False)
    op.create_index('ix_customers_zone', 'customers', ['zone'], unique=False)
    op.create_index('ix_customers_package_id', 'customers', ['package_id'], unique=False)
    op.create_index('ix_customers_connection_status', 'customers', ['connection_status'], unique=False)

    # 5. conversations
    op.create_table(
        'conversations',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('customer_id', sa.String(length=36), sa.ForeignKey('customers.id', ondelete='SET NULL'), nullable=True),
        sa.Column('assigned_agent_id', sa.String(length=36), sa.ForeignKey('agents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('channel', sa.String(length=50), nullable=False, server_default='webchat'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='ai_handling'),
        sa.Column('priority', sa.String(length=50), nullable=False, server_default='normal'),
        sa.Column('customer_name', sa.String(length=255), nullable=True),
        sa.Column('customer_phone', sa.String(length=50), nullable=True),
        sa.Column('subscriber_id', sa.String(length=50), nullable=True),
        sa.Column('is_ai_handled', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('metadata_info', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_conversations_customer_id', 'conversations', ['customer_id'], unique=False)
    op.create_index('ix_conversations_assigned_agent_id', 'conversations', ['assigned_agent_id'], unique=False)
    op.create_index('ix_conversations_channel', 'conversations', ['channel'], unique=False)
    op.create_index('ix_conversations_status', 'conversations', ['status'], unique=False)
    op.create_index('ix_conversations_priority', 'conversations', ['priority'], unique=False)
    op.create_index('ix_conversations_subscriber_id', 'conversations', ['subscriber_id'], unique=False)
    op.create_index('ix_conversations_is_ai_handled', 'conversations', ['is_ai_handled'], unique=False)
    op.create_index('ix_conversations_created_at', 'conversations', ['created_at'], unique=False)

    # 6. messages
    op.create_table(
        'messages',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('conversation_id', sa.String(length=36), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sender_type', sa.String(length=50), nullable=False),
        sa.Column('sender_name', sa.String(length=100), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('tool_calls', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_messages_conversation_id', 'messages', ['conversation_id'], unique=False)
    op.create_index('ix_messages_sender_type', 'messages', ['sender_type'], unique=False)
    op.create_index('ix_messages_created_at', 'messages', ['created_at'], unique=False)

    # 7. tickets
    op.create_table(
        'tickets',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('ticket_number', sa.String(length=50), nullable=False),
        sa.Column('customer_id', sa.String(length=36), sa.ForeignKey('customers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('conversation_id', sa.String(length=36), sa.ForeignKey('conversations.id', ondelete='SET NULL'), nullable=True),
        sa.Column('assigned_agent_id', sa.String(length=36), sa.ForeignKey('agents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False, server_default='optical_loss'),
        sa.Column('priority', sa.String(length=50), nullable=False, server_default='urgent'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='open'),
        sa.Column('optical_loss_dbm', sa.Float(), nullable=True),
        sa.Column('sla_deadline', sa.DateTime(), nullable=True),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_tickets_ticket_number', 'tickets', ['ticket_number'], unique=True)
    op.create_index('ix_tickets_customer_id', 'tickets', ['customer_id'], unique=False)
    op.create_index('ix_tickets_conversation_id', 'tickets', ['conversation_id'], unique=False)
    op.create_index('ix_tickets_assigned_agent_id', 'tickets', ['assigned_agent_id'], unique=False)
    op.create_index('ix_tickets_category', 'tickets', ['category'], unique=False)
    op.create_index('ix_tickets_priority', 'tickets', ['priority'], unique=False)
    op.create_index('ix_tickets_status', 'tickets', ['status'], unique=False)
    op.create_index('ix_tickets_created_at', 'tickets', ['created_at'], unique=False)

    # 8. payments
    op.create_table(
        'payments',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('customer_id', sa.String(length=36), sa.ForeignKey('customers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('transaction_id', sa.String(length=100), nullable=False),
        sa.Column('amount_bdt', sa.Float(), nullable=False),
        sa.Column('payment_method', sa.String(length=50), nullable=False, server_default='bkash'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='paid'),
        sa.Column('billing_month', sa.String(length=50), nullable=False),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('metadata_info', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_payments_transaction_id', 'payments', ['transaction_id'], unique=True)
    op.create_index('ix_payments_customer_id', 'payments', ['customer_id'], unique=False)
    op.create_index('ix_payments_status', 'payments', ['status'], unique=False)
    op.create_index('ix_payments_billing_month', 'payments', ['billing_month'], unique=False)
    op.create_index('ix_payments_payment_method', 'payments', ['payment_method'], unique=False)
    op.create_index('ix_payments_created_at', 'payments', ['created_at'], unique=False)

    # 9. leads
    op.create_table(
        'leads',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=50), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('zone', sa.String(length=100), nullable=False),
        sa.Column('address', sa.Text(), nullable=False),
        sa.Column('package_id', sa.String(length=36), sa.ForeignKey('packages.id', ondelete='SET NULL'), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='new'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_leads_phone', 'leads', ['phone'], unique=False)
    op.create_index('ix_leads_zone', 'leads', ['zone'], unique=False)
    op.create_index('ix_leads_package_id', 'leads', ['package_id'], unique=False)
    op.create_index('ix_leads_status', 'leads', ['status'], unique=False)
    op.create_index('ix_leads_created_at', 'leads', ['created_at'], unique=False)

    # 10. knowledge_documents
    op.create_table(
        'knowledge_documents',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False, server_default='troubleshooting'),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('keywords', sa.JSON(), nullable=True),
        sa.Column('citations_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('views_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_published', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('author', sa.String(length=100), nullable=False, server_default='NOC Documentation Team'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_knowledge_documents_title', 'knowledge_documents', ['title'], unique=False)
    op.create_index('ix_knowledge_documents_slug', 'knowledge_documents', ['slug'], unique=True)
    op.create_index('ix_knowledge_documents_category', 'knowledge_documents', ['category'], unique=False)
    op.create_index('ix_knowledge_documents_is_published', 'knowledge_documents', ['is_published'], unique=False)
    op.create_index('ix_knowledge_documents_created_at', 'knowledge_documents', ['created_at'], unique=False)

    # 11. tool_logs
    op.create_table(
        'tool_logs',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('tool_name', sa.String(length=100), nullable=False),
        sa.Column('conversation_id', sa.String(length=36), nullable=True),
        sa.Column('subscriber_id', sa.String(length=50), nullable=True),
        sa.Column('input_args', sa.JSON(), nullable=True),
        sa.Column('output_result', sa.JSON(), nullable=True),
        sa.Column('gemini_model', sa.String(length=50), nullable=False, server_default='gemini-1.5-flash'),
        sa.Column('execution_time_ms', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('confidence_score', sa.Float(), nullable=False, server_default='0.95'),
        sa.Column('escalated', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_tool_logs_tool_name', 'tool_logs', ['tool_name'], unique=False)
    op.create_index('ix_tool_logs_conversation_id', 'tool_logs', ['conversation_id'], unique=False)
    op.create_index('ix_tool_logs_subscriber_id', 'tool_logs', ['subscriber_id'], unique=False)
    op.create_index('ix_tool_logs_escalated', 'tool_logs', ['escalated'], unique=False)
    op.create_index('ix_tool_logs_created_at', 'tool_logs', ['created_at'], unique=False)

    # 12. ai_feedback
    op.create_table(
        'ai_feedback',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('conversation_id', sa.String(length=36), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('message_id', sa.String(length=36), sa.ForeignKey('messages.id', ondelete='SET NULL'), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('is_resolved', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('feedback_text', sa.Text(), nullable=True),
        sa.Column('customer_sentiment', sa.String(length=50), nullable=False, server_default='positive'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_ai_feedback_conversation_id', 'ai_feedback', ['conversation_id'], unique=False)
    op.create_index('ix_ai_feedback_message_id', 'ai_feedback', ['message_id'], unique=False)
    op.create_index('ix_ai_feedback_is_resolved', 'ai_feedback', ['is_resolved'], unique=False)
    op.create_index('ix_ai_feedback_customer_sentiment', 'ai_feedback', ['customer_sentiment'], unique=False)
    op.create_index('ix_ai_feedback_created_at', 'ai_feedback', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_table('ai_feedback')
    op.drop_table('tool_logs')
    op.drop_table('knowledge_documents')
    op.drop_table('leads')
    op.drop_table('payments')
    op.drop_table('tickets')
    op.drop_table('messages')
    op.drop_table('conversations')
    op.drop_table('customers')
    op.drop_table('packages')
    op.drop_table('agents')
    op.drop_table('users')
