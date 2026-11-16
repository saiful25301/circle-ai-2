export type Language = 'en' | 'bn';

export interface Translations {
  headerTitle: string;
  teamSubtitle: string;
  greetingTitle: string;
  greetingSubtitle: string;
  sendUsMessage: string;
  sendUsMessageSub: string;
  responseSpeed: string;
  searchPlaceholder: string;
  recentConversations: string;
  startNewChat: string;
  suggestedQuestions: string;
  onlineStatus: string;
  supportTeam: string;
  tabHome: string;
  tabMessages: string;
  tabHelp: string;
  inputPlaceholder: string;
  send: string;
  typingText: string;
  requestHumanSupport: string;
  humanSupportNotice: string;
  escalatedToHuman: string;
  retry: string;
  networkError: string;
  hotlineText: string;
  opticalPower: string;
  rebootPort: string;
  checkBill: string;
  plans: string;
  resolved: string;
  aiHandled: string;
  subscriberBadge: string;
  quickQuestions: Array<{ id: string; label: string; query: string }>;
}

export const translations: Record<Language, Translations> = {
  en: {
    headerTitle: 'Circle AI',
    teamSubtitle: 'Our team can also help',
    greetingTitle: 'Hi there 👋',
    greetingSubtitle: 'How can we help you today with your Circle Network connection?',
    sendUsMessage: 'Send us a message',
    sendUsMessageSub: 'Our AI and support team typically reply in seconds',
    responseSpeed: 'Usually replies in under 1 min',
    searchPlaceholder: 'Search for help articles...',
    recentConversations: 'Recent Conversations',
    startNewChat: 'Start a new conversation',
    suggestedQuestions: 'Popular Questions',
    onlineStatus: 'Online',
    supportTeam: 'Circle Support Team',
    tabHome: 'Home',
    tabMessages: 'Messages',
    tabHelp: 'Help',
    inputPlaceholder: 'Type your message...',
    send: 'Send',
    typingText: 'Circle AI is typing...',
    requestHumanSupport: 'Talk to team',
    humanSupportNotice: 'Connecting you with our support team...',
    escalatedToHuman: 'Speaking with Support Team',
    retry: 'Retry',
    networkError: 'Unable to reach support server. Please check your connection.',
    hotlineText: 'Helpline: 09611800800 (24/7)',
    opticalPower: 'Optical Signal',
    rebootPort: 'Reboot ONU Port',
    checkBill: 'Check Bill & Due',
    plans: 'View Packages',
    resolved: 'Resolved',
    aiHandled: 'Automated by AI',
    subscriberBadge: 'Subscriber',
    quickQuestions: [
      { id: 'signal', label: '📡 Check Optical Signal', query: 'Diagnose my fiber optical power signal level' },
      { id: 'bill', label: '💳 Bill & bKash Payment', query: 'How much is my bill and how to pay via bKash?' },
      { id: 'los', label: '🔴 Red LOS Light on ONU', query: 'My ONU has a blinking Red LOS light' },
      { id: 'reboot', label: '🔄 Reboot My Connection', query: 'Can you restart my ONU connection port?' },
      { id: 'plans', label: '🚀 Internet Packages', query: 'What packages and speeds are available?' },
      { id: 'router', label: '🛠️ Wi-Fi Router Setup', query: 'How to configure PPPoE on my Wi-Fi router?' },
    ],
  },
  bn: {
    headerTitle: 'সার্কেল এআই',
    teamSubtitle: 'আমাদের টিমও সাহায্য করতে পারে',
    greetingTitle: 'স্বাগতম 👋',
    greetingSubtitle: 'সার্কেল নেটওয়ার্ক ইন্টারনেট সংযোগ সম্পর্কিত কী সাহায্য করতে পারি?',
    sendUsMessage: 'নতুন মেসেজ পাঠান',
    sendUsMessageSub: 'আমাদের এআই ও সাপোর্ট টিম দ্রুত উত্তর দেবে',
    responseSpeed: 'সাধারণত ১ মিনিটের কম সময়ে উত্তর পাবেন',
    searchPlaceholder: 'সাহায্য বিষয়ক তথ্য খুঁজুন...',
    recentConversations: 'পূর্ববর্তী বার্তালাপ',
    startNewChat: 'নতুন আলোচনা শুরু করুন',
    suggestedQuestions: 'সাধারণ জিজ্ঞাসাসমূহ',
    onlineStatus: 'অনলাইন',
    supportTeam: 'সার্কেল সাপোর্ট টিম',
    tabHome: 'হোম',
    tabMessages: 'মেসেজ',
    tabHelp: 'হেল্প',
    inputPlaceholder: 'আপনার বার্তা বা সমস্যা লিখুন...',
    send: 'পাঠান',
    typingText: 'সার্কেল এআই লিখছে...',
    requestHumanSupport: 'টিমের সাথে কথা বলুন',
    humanSupportNotice: 'সার্কেল সাপোর্ট টিমের সাথে কানেক্ট করা হচ্ছে...',
    escalatedToHuman: 'সাপোর্ট টিমের সাথে যুক্ত',
    retry: 'আবার চেষ্টা করুন',
    networkError: 'সার্ভারের সাথে সংযোগে সমস্যা হচ্ছে।',
    hotlineText: 'সার্কেল হেল্পলাইন: ০৯৬১১৮০০৮০০ (২৪/৭)',
    opticalPower: 'অপটিক্যাল সিগন্যাল',
    rebootPort: 'পোর্ট রিবুট',
    checkBill: 'বিল ও বকেয়া চেক',
    plans: 'প্যাকেজসমূহ দেখুন',
    resolved: 'সমাধান হয়েছে',
    aiHandled: 'এআই দ্বারা সমাধানকৃত',
    subscriberBadge: 'গ্রাহক',
    quickQuestions: [
      { id: 'signal', label: '📡 অপটিক্যাল সিগন্যাল চেক', query: 'আমার লাইনের অপটিক্যাল ফাইবার সিগন্যাল (dBm) চেক করুন' },
      { id: 'bill', label: '💳 বিল ও বিকাশ পেমেন্ট', query: 'আমার বর্তমান বিল কত এবং বিকাশে কীভাবে পরিশোধ করব?' },
      { id: 'los', label: '🔴 ONU-তে লাল LOS লাইট', query: 'আমার রাউটার/ONU-তে লাল LOS লাইট জ্বলছে' },
      { id: 'reboot', label: '🔄 কানেকশন রিবুট করুন', query: 'আমার সংযোগ পোর্টটি কি রিবুট বা রিসেট করে দেওয়া যাবে?' },
      { id: 'plans', label: '🚀 ইন্টারনেট প্যাকেজসমূহ', query: 'সার্কেল নেটওয়ার্কের বিভিন্ন প্যাকেজ ও স্পিড সম্পর্কে জানান' },
      { id: 'router', label: '🛠️ ওয়াইফাই রাউটার সেটআপ', query: 'ওয়াইফাই রাউটারে PPPoE কনফিগার করার নিয়ম কী?' },
    ],
  },
};
