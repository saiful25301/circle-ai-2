import { Language } from './localization/translations';
import { Message } from '../../types';

export type WidgetView = 'home' | 'chat' | 'messages' | 'help';

export interface WidgetProps {
  /** When true, renders directly inline in the page rather than as a floating bottom-right drawer */
  embedded?: boolean;
  /** Primary brand color override (default: #FDBC1F) */
  primaryColor?: string;
  /** Secondary brand color override (default: #3F3F3F) */
  secondaryColor?: string;
  /** Path or URL to official Circle Network logo */
  logoUrl?: string;
  /** Initial selected language (default: 'en') */
  initialLanguage?: Language;
  /** Subscriber ID override for authenticating the customer */
  subscriberId?: string;
  /** Callback fired when a new message is received or conversation is updated */
  onMessageReceived?: (message: Message) => void;
  /** Whether the floating launcher is open by default */
  defaultOpen?: boolean;
}

export interface MockSubscriber {
  id: string;
  name: string;
  zone: string;
  phone: string;
  plan: string;
  powerDbm: number;
  status: 'online' | 'degraded';
}

export const MOCK_TEST_SUBSCRIBERS: MockSubscriber[] = [
  {
    id: 'CN-88214',
    name: 'Rashedul Hasan',
    zone: 'Mirpur-10, Dhaka',
    phone: '+8801711223344',
    plan: 'Circle Fast 30 Mbps',
    powerDbm: -19.4,
    status: 'online'
  },
  {
    id: 'CN-99412',
    name: 'Tanvir Ahmed',
    zone: 'Dhanmondi 27, Dhaka',
    phone: '+8801819887766',
    plan: 'Circle Gamer 60 Mbps',
    powerDbm: -28.9,
    status: 'degraded'
  }
];
