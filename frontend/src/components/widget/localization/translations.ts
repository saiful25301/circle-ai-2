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
  quickQuestions: Array<{ id: string; label: string; query: string; sublabel?: string }>;
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
    searchPlaceholder: 'Search for packages, billing, or support...',
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
    hotlineText: 'Helpline: 09611800800 / 16207 (24/7)',
    opticalPower: 'Optical Signal',
    rebootPort: 'Reboot ONU Port',
    checkBill: 'Check Bill & Due',
    plans: 'View Packages',
    resolved: 'Resolved',
    aiHandled: 'Automated by AI',
    subscriberBadge: 'Subscriber',
    quickQuestions: [
      {
        id: 'home_packages',
        label: '🚀 Home Internet Packages',
        query: 'What are Circle Network home internet packages, speeds, and monthly pricing?',
        sublabel: 'Circle Fiber 32 Mbps (৳799), 50 Mbps, 70 Mbps (৳999), 150 Mbps & 200 Mbps',
      },
      {
        id: 'new_connection',
        label: '⚡ New Connection Request',
        query: 'I want to apply for a new Circle Network optical fiber internet connection',
        sublabel: 'Fast installation with priority optical line setup',
      },
      {
        id: 'coverage_area',
        label: '📍 Coverage Area Check',
        query: 'Is Circle Network fiber broadband available in my area or thana?',
        sublabel: 'Mirpur, Dhanmondi, Uttara, Gulshan, Banani, Mohammadpur & nationwide zones',
      },
      {
        id: 'bill_payment',
        label: '💳 Bill Payment (bKash / Nagad / Portal)',
        query: 'How can I pay my Circle Network monthly internet bill using bKash, Nagad, or Self Care portal?',
        sublabel: 'Instant recharge via bKash, Nagad, Rocket, Upay & CID Quick Pay',
      },
      {
        id: 'corporate_internet',
        label: '🏢 Corporate Internet Solutions',
        query: 'Tell me about Circle Network corporate leased line and enterprise solutions',
        sublabel: '1:1 dedicated bandwidth, redundant backup fiber & 99.9% uptime SLA',
      },
      {
        id: 'career_support',
        label: '📞 Career & 24/7 Support (09611800800)',
        query: 'How to contact 24/7 NOC customer helpline (09611800800 / 16207) or view career opportunities?',
        sublabel: '24/7 NOC Helpdesk (09611800800 / 16207) & career opportunities at Circle Network',
      },
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
    searchPlaceholder: 'প্যাকেজ, বিল বা সহায়তা খুঁজুন...',
    recentConversations: 'পূর্ববর্তী বার্তালাপ',
    startNewChat: 'নতুন আলোচনা শুরু করুন',
    suggestedQuestions: 'জনপ্রিয় সেবা ও অনুসন্ধন',
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
    hotlineText: 'সার্কেল হেল্পলাইন: ০৯৬১১৮০০৮০০ / ১৬২০৭ (২৪/৭)',
    opticalPower: 'অপটিক্যাল সিগন্যাল',
    rebootPort: 'পোর্ট রিবুট',
    checkBill: 'বিল ও বকেয়া চেক',
    plans: 'প্যাকেজসমূহ দেখুন',
    resolved: 'সমাধান হয়েছে',
    aiHandled: 'এআই দ্বারা সমাধানকৃত',
    subscriberBadge: 'গ্রাহক',
    quickQuestions: [
      {
        id: 'home_packages',
        label: '🚀 হোম ইন্টারনেট প্যাকেজ',
        query: 'সার্কেল নেটওয়ার্কের অফিসিয়াল হোম ইন্টারনেট প্যাকেজ, স্পিড ও মাসিক ফি বিস্তারিত বলুন',
        sublabel: 'Circle Fiber ৩২ Mbps (৳৭৯৯), ৫০ Mbps, ৭০ Mbps (৳৯৯৯), ১৫০ Mbps ও ২০০ Mbps',
      },
      {
        id: 'new_connection',
        label: '⚡ নতুন সংযোগের আবেদন',
        query: 'আমি সার্কেল নেটওয়ার্কের নতুন ফাইবার অপটিক্যাল ইন্টারনেট সংযোগ নিতে চাই',
        sublabel: 'অগ্রাধিকার ভিত্তিতে দ্রুততম সময়ে হোম ও অফিস সংযোগ',
      },
      {
        id: 'coverage_area',
        label: '📍 কভারেজ এরিয়া চেক',
        query: 'আমার এলাকায় কি সার্কেল নেটওয়ার্কের ফাইবার অপটিক্যাল ইন্টারনেট সেবা আছে?',
        sublabel: 'মিরপুর, ধানমন্ডি, উত্তরা, গুলশান, বনানী, মোহাম্মদপুর সহ সমগ্র ঢাকাব্যাপী',
      },
      {
        id: 'bill_payment',
        label: '💳 বিল পেমেন্ট (বিকাশ, নগদ ও সেলফ কেয়ার)',
        query: 'বিকাশ, নগদ বা সেলফ কেয়ার পোর্টালের মাধ্যমে সার্কেল নেটওয়ার্কের বিল পরিশোধ করার নিয়ম কী?',
        sublabel: 'বিকাশ, নগদ, রকেট, উপায় এবং গ্রাহক আইডি (CID) কুইক পে',
      },
      {
        id: 'corporate_internet',
        label: '🏢 কর্পোরেট ইন্টারনেট ও লিজড লাইন',
        query: 'সার্কেল নেটওয়ার্কের কর্পোরেট ও এন্টারপ্রাইজ লিজড লাইন ইন্টারনেট সমাধান সম্পর্কে বলুন',
        sublabel: '১:১ ডেডিকেটেড ব্যান্ডউইথ, রিডান্ড্যান্ট ফাইবার ব্যাকবোন ও ৯৯.৯% আপটাইম SLA',
      },
      {
        id: 'career_support',
        label: '📞 ক্যারিয়ার ও ২৪/৭ হেল্পলাইন (০৯৬১১৮০০৮০০)',
        query: 'সার্কেল নেটওয়ার্কের ২৪/৭ কাস্টমার সাপোর্ট হেল্পলাইন (০৯৬১১৮০০৮০০ / ১৬২০৭) অথবা ক্যারিয়ার তথ্য দিন',
        sublabel: 'সার্কেল ২৪/৭ এনওসি হেল্পলাইন (০৯৬১১৮০০৮০০ / ১৬২০৭) এবং ক্যারিয়ার বিজ্ঞপ্তি',
      },
    ],
  },
};
