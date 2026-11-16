import logging
import math
import re
import uuid
from typing import List, Dict, Any, Optional
from sqlalchemy import select, or_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.knowledge import KnowledgeDocument, KnowledgeChunk

logger = logging.getLogger(__name__)

# -----------------------------------------------------------------------------
# Official Verified Circle Network Bangladesh Knowledge Articles
# Extracted from https://www.circlenetworkbd.net/bn and official package materials
# -----------------------------------------------------------------------------

REAL_CIRCLE_KNOWLEDGE_ARTICLES = [
    {
        "id": "kb-pkg-real-01",
        "title": "Circle Network Official Internet Packages & Pricing (২০২৬)",
        "slug": "circle-network-official-packages-pricing",
        "category": "packages",
        "summary": "সার্কেল নেটওয়ার্কের অফিসিয়াল রেগুলার ও গেমিং ফাইবার ইন্টারনেট প্যাকেজ, স্পিড ও মাসিক মূল্য তালিকা।",
        "keywords": ["package", "packages", "price", "speed", "mbps", "799", "840", "999", "1500", "2500", "32mbps", "50mbps", "70mbps", "200mbps", "প্যাকেজ", "দাম"],
        "content": (
            "সার্কেল নেটওয়ার্ক (Circle Network) বাংলাদেশের একটি অগ্রণী দেশব্যাপী লাইসেন্সপ্রাপ্ত ফাইবার অপটিক্যাল আইএসপি। "
            "অফিসিয়াল অনুমোদিত প্যাকেজ ও মাসিক ফি (ভ্যাট ও শর্ত প্রযোজ্য):\n\n"
            "১. Circle Fiber 32 Mbps (Standard Fiber): মাসিক ৳৭৯৯ টাকা। বাফারলেস ফেসবুক ভিডিও ও এইচডি ইউটিউব স্ট্রিমিং, ১০০ Mbps BDIX স্পিড, ২৪/৭ কাস্টমার সাপোর্ট।\n"
            "২. Circle Fiber 50 Mbps (Family Choice): মাসিক ৳৮৪০ টাকা। মাঝারি পরিবারের জন্য আদর্শ, বাফারলেস UHD ইউটিউব ও HD ফেসবুক, ১০০ Mbps BDIX ক্যাশ স্পিড।\n"
            "৩. Circle Fiber 70 Mbps (Most Popular / Best Seller): মাসিক ৳৯৯৯ টাকা। সার্কেল নেটওয়ার্কের সর্বাধিক জনপ্রিয় হোম প্যাকেজ! একাধিক ডিভাইসে বাফারলেস ২K/৪K স্ট্রিমিং, সেরা গেমিং পিং ও ১০০ Mbps BDIX স্পিড।\n"
            "৪. Circle Fiber 150 Mbps (Stream Pro): মাসিক ৳১,৫০০ টাকা। হেভি ডাউনলোডার ও কন্টেন্ট ক্রিয়েটরদের জন্য আল্ট্রা-স্পিড, বাফারলেস ৪K ভিডিও এবং ফ্রি IPv6 পাবলিক আইপি।\n"
            "৫. Circle Fiber 200 Mbps (Gamer's Choice / Go Ultra): মাসিক ৳২,৫০০ টাকা (প্রমোশনাল ৳২,০০০-৳২,৫০০)। প্রো-গেমিং ইন্টারনেট (< ১৫ms লেটেন্সি), আল্ট্রা ফাস্ট ৩০০ Mbps BDIX ক্যাশ ও ফ্রি IPv6 পাবলিক আইপি।\n\n"
            "বৈশিষ্ট্য: সকল প্যাকেজে আনলিমিটেড ডেটা (True Unlimited - কোনো ডেটা ক্যাপ বা FUP স্পিড ড্রপ নেই), অপটিক্যাল ফাইবার সংযোগ ও ২৪/৭ ডেডিকেটেড সাপোর্ট।"
        )
    },
    {
        "id": "kb-pay-real-02",
        "title": "Circle Network Bill Payment Methods & Policies (বিকাশ, নগদ, রকেট, উপায়)",
        "slug": "bill-payment-methods-bkash-nagad-schedule",
        "category": "billing",
        "summary": "সার্কেল নেটওয়ার্কের বিল পরিশোধের অনুমোদিত মাধ্যম, সেলফ কেয়ার, কুইক পে ও বিলিং সাইকেল পলিসি।",
        "keywords": ["bill", "payment", "bkash", "nagad", "rocket", "upay", "quick pay", "self care", "cid", "বিল", "পেমেন্ট", "বিকাশ", "নগদ"],
        "content": (
            "সার্কেল নেটওয়ার্কের অনুমোদিত বিল পেমেন্ট মাধ্যম ও বিলিং নীতিমালা:\n\n"
            "১. মোবাইল ব্যাংকিং (MFS): বিকাশ (bKash), নগদ (Nagad), রকেট (Rocket), এবং উপায় (Upay) অ্যাপের মাধ্যমে সহজে বিল পরিশোধ করা যায়। "
            "অ্যাপে গিয়ে 'Pay Bill' বা 'Make Payment' অপশনে Circle Network মার্চেন্টে বিল পে করুন। রেফারেন্সে অবশ্যই আপনার সাবস্ক্রাইবার আইডি (যেমন: CN-88214) লিখুন।\n"
            "২. সরাসরি পেমেন্ট পোর্টাল:\n"
            "   - সেলফ কেয়ার পোর্টাল (Self Care Portal): গ্রাহক আইডি ও পাসওয়ার্ড দিয়ে লগইন করে কার্ড বা মোবাইল ওয়ালেটে পেমেন্ট করা যায়।\n"
            "   - কুইক পে (Quick Pay / CID): লগইন ছাড়াই সরাসরি কাস্টমার আইডি (CID) টাইপ করে বিল চেক ও পরিশোধের সুবিধা।\n"
            "   - অ্যান্ড্রয়েড বিলিং অ্যাপ: গুগল প্লে স্টোর থেকে সার্কেল নেটওয়ার্ক অ্যাপ ডাউনলোড করে এক ক্লিকে বিল পে করা যায়।\n\n"
            "বিলিং সময়সীমা ও নিয়ম:\n"
            "- প্রতি মাসের ১ তারিখে চলতি মাসের বিল জেনারেট হয়।\n"
            "- গ্রাহকদের প্রতি মাসের ৭ থেকে ১০ তারিখের মধ্যে বিল পরিশোধ করতে অনুরোধ করা হয়।\n"
            "- বকেয়া থাকলে ১০ তারিখের পর সংযোগ সাময়িক স্থগিত (auto-suspended) হতে পারে।\n"
            "- বিল পরিশোধের ৫ থেকে ১০ মিনিটের মধ্যে সংযোগ স্বয়ংক্রিয়ভাবে পুনরায় সচল (auto-reconnect) হয়ে যায়।"
        )
    },
    {
        "id": "kb-cov-real-03",
        "title": "Circle Network Nationwide Coverage Areas (আমাদের কভারেজ)",
        "slug": "circle-network-coverage-areas-dhaka-nationwide",
        "category": "coverage",
        "summary": "ঢাকা শহর ও সমগ্র বাংলাদেশের ৫৪+ জেলায় সার্কেল নেটওয়ার্কের অপটিক্যাল ফাইবার কভারেজ নেটওয়ার্ক।",
        "keywords": ["coverage", "area", "zones", "dhaka", "mirpur", "dhanmondi", "uttara", "gulshan", "banani", "কভারেজ", "এলাকা", "ঢাকা"],
        "content": (
            "সার্কেল নেটওয়ার্ক সমগ্র বাংলাদেশব্যাপী ৫৪টিরও বেশি জেলায় নির্ভরযোগ্য হাই-স্পিড অপটিক্যাল ফাইবার ব্রডব্যান্ড সরবরাহ করে।\n\n"
            "ঢাকা বিভাগের মূল কভারেজ জোনসমূহ:\n"
            "- ধানমন্ডি, লালমাটিয়া, কলাবাগান, শুক্রাবাদ\n"
            "- গুলশান (১ ও ২), বনানী, বারিধারা, মহাখালী, নিকেতন\n"
            "- মিরপুর (মিরপুর ১ থেকে ১৪, পল্লবী, ডিওএইচএস)\n"
            "- উত্তরা (সেক্টর ১ থেকে ১৮), দিয়াবাড়ি\n"
            "- মোহাম্মদপুর, আদাবর, জাপান গার্ডেন সিটি\n"
            "- তেজগাঁও, ফার্মগেট, ইন্দিরা রোড, তেজকুনীপাড়া\n"
            "- ইস্কাটন, মগবাজার, মালিবাগ, শান্তিনগর, সিদ্ধেশ্বরী\n"
            "- মতিঝিল, দিলকুশা, পল্টন, কাকরাইল\n"
            "- বসুন্ধরা আবাসিক এলাকা, বাড্ডা, রামপুরা, খিলগাঁও, বনশ্রী\n"
            "- পুরান ঢাকা (ওয়ারী, লালবাগ, বংশাল, সূত্রাপুর, সদরঘাট)\n\n"
            "অন্যান্য প্রধান জেলা: চট্টগ্রাম, সিলেট, রাজশাহী, খুলনা, বরিশাল, ময়মনসিংহ, রংপুর, কুমিল্লা, গাজীপুর, নারায়ণগঞ্জ, সাভার ইত্যাদি। "
            "আমাদের নেটওয়ার্কে ৯৯.৯% আপটাইম এবং ২৪/৭ রিয়েল-টাইম সেন্ট্রাল NOC মনিটরিং নিশ্চিত করা হয়।"
        )
    },
    {
        "id": "kb-ins-real-04",
        "title": "New Connection Process & Installation Policy (নতুন সংযোগ)",
        "slug": "new-connection-process-installation-policy",
        "category": "installation",
        "summary": "নতুন ইন্টারনেট সংযোগের আবেদন প্রক্রিয়া, ইনস্টলেশন সময়সীমা (২৪-৪৮ ঘণ্টা) ও হটলাইন নম্বর।",
        "keywords": ["new connection", "installation", "setup", "hotline", "16207", "01611411211", "নতুন সংযোগ", "ইনস্টলেশন"],
        "content": (
            "সার্কেল নেটওয়ার্কের নতুন ফাইবার অপটিক্যাল সংযোগ গ্রহণ প্রক্রিয়া অত্যন্ত সহজ ও দ্রুত:\n\n"
            "১. আবেদনের ধাপসমূহ:\n"
            "   - ওয়েবসাইট (https://www.circlenetworkbd.net/bn), সার্কেল এআই চ্যাটবট, অথবা হটলাইনে সরাসরি আবেদন করুন।\n"
            "   - নাম, মোবাইল নম্বর, পূর্ণাঙ্গ ঠিকানা (বাড়ি, রোড, এলাকা/থানা) ও পছন্দের প্যাকেজ নির্বাচন করুন।\n"
            "২. যোগাযোগ ও হটলাইন নম্বর:\n"
            "   - নতুন সংযোগ হটলাইন: ০১৬১১৪১১২১১ (01611411211)\n"
            "   - ২৪/৭ সেন্ট্রাল হেল্পলাইন: ১৬২০৭ (16207)\n"
            "   - সাপোর্ট ইমেইল: support@circlenetworkbd.net\n"
            "৩. ইনস্টলেশন সময়সীমা (SLA):\n"
            "   - আবেদন যাচাই ও ফিজিবিলিটি কনফার্মেশনের পর ২৪ থেকে ৪৮ ঘণ্টার মধ্যে আমাদের ফিল্ড টেকনিক্যাল টিম আপনার বাসায় বা অফিসে অপটিক্যাল ফাইবার ড্রপ তার ও ONU ডিভাইস ইনস্টল করে লাইন চালু করে দেয়।\n"
            "৪. প্রয়োজনীয় ডকুমেন্টস: জাতীয় পরিচয়পত্র (NID)-এর কপি এবং ১ কপি পাসপোর্ট সাইজ ছবি।"
        )
    },
    {
        "id": "kb-cmp-real-05",
        "title": "Circle Network Company Overview, Office Address & Enterprise Solutions",
        "slug": "circle-network-company-overview-address-corporate",
        "category": "company",
        "summary": "সার্কেল নেটওয়ার্কের প্রধান কার্যালয়, হেড অফিস ঠিকানা, বিটিআরসি লাইসেন্স ও এন্টারপ্রাইজ ব্যাংকিং ক্লায়েন্ট।",
        "keywords": ["company", "office", "address", "eskaton", "unique heights", "corporate", "btrc", "সার্কেল নেটওয়ার্ক", "ঠিকানা", "অফিস"],
        "content": (
            "সার্কেল নেটওয়ার্ক (Circle Network) — 'Connect to the world...'\n"
            "আধুনিক বাড়ি এবং দূরদর্শী ব্যবসার জন্য প্রিমিয়াম দেশব্যাপী কানেক্টিভিটি সলিউশন প্রদানকারী প্রতিষ্ঠান।\n\n"
            "প্রধান কার্যালয়ের ঠিকানা:\n"
            "ইউনিক হাইটস, লেভেল-৮, ১১৭ কাজী নজরুল ইসলাম এভিনিউ, ইস্কাটন, ঢাকা, বাংলাদেশ।\n"
            "(Unique Heights, Level-8, 117 Kazi Nazrul Islam Avenue, Eskaton, Dhaka, Bangladesh)\n\n"
            "যোগাযোগ চ্যানেল:\n"
            "- হেল্পলাইন শর্ট কোড: ১৬২০৭ (16207)\n"
            "- নতুন সংযোগ ও কর্পোরেট হটলাইন: ০১৬১১৪১১২১১ (01611411211)\n"
            "- ইমেইল: support@circlenetworkbd.net\n"
            "- ওয়েবসাইট: https://www.circlenetworkbd.net/bn\n"
            "- ফেসবুক পেজ: www.facebook.com/Circlenetworkbd\n\n"
            "কর্পোরেট ও এন্টারপ্রাইজ সলিউশন:\n"
            "- ডেডিকেটেড ১:১ এন্টারপ্রাইজ লিজড লাইন (৯৯.৯% আপটাইম এসএলএ)\n"
            "- ইন্ট্রানেট ডাটা কানেক্টিভিটি ও মাল্টি-প্রটোকল লেবেল সুইচিং (MPLS VPN)\n"
            "- আমাদের বিশ্বস্ত কর্পোরেট ক্লায়েন্টদের মধ্যে রয়েছে: One Bank, BRAC Bank, Prime Bank, Premier Bank, Jamuna Bank, UCB, NRB Bank, Union Bank, EXIM Bank, IDLC Finance ইত্যাদি।"
        )
    },
    {
        "id": "kb-ofr-real-06",
        "title": "Special Offers: Parle Snacks 10% Discount & 200 Tk Referral Bonus",
        "slug": "special-offers-parle-discount-referral-bonus",
        "category": "offers",
        "summary": "সার্কেল নেটওয়ার্ক গ্রাহকদের জন্য পার্লে স্ন্যাকসে ১০% বিশেষ ছাড় এবং বন্ধু রেফার করলে ২০০ টাকা ক্যাশ বোনাস।",
        "keywords": ["offer", "offers", "discount", "parle", "referral", "bonus", "200tk", "অফার", "ডিসকাউন্ট", "বোনাস"],
        "content": (
            "সার্কেল নেটওয়ার্ক গ্রাহকদের জন্য বর্তমান চলমান এক্সক্লুসিভ অফারসমূহ:\n\n"
            "১. পার্লে স্ন্যাকসে ১০% এক্সক্লুসিভ ছাড়:\n"
            "   - সার্কেল নেটওয়ার্কের সকল সক্রিয় ইন্টারনেট ব্যবহারকারীদের জন্য পার্লে স্ন্যাকসে (Parle Snacks) থাকছে ১০% ফ্ল্যাট ডিসকাউন্ট!\n"
            "   - গেমিং বা আড্ডায় মুখরোচক স্ন্যাকস উপভোগ করতে সার্কেল কাস্টমার আইডি শো করে অফারটি গ্রহণ করা যাবে।\n\n"
            "২. রেফারেল পুরস্কার — পান ২০০ টাকা ক্যাশ বোনাস:\n"
            "   - আপনার বন্ধু, প্রতিবেশী বা স্বজনকে সার্কেল নেটওয়ার্কের ফাইবার ইন্টারনেট সংযোগে আমন্ত্রণ জানান।\n"
            "   - রেফার করা গ্রাহকের সংযোগ সফলভাবে সম্পন্ন হলে আপনি পাবেন ২০০ টাকা নিশ্চিত ক্যাশ বোনাস!\n"
            "   - সকলের জন্য উন্মুক্ত — যত বেশি রেফার করবেন, তত বেশি ক্যাশ বোনাস জিতবেন।"
        )
    },
    {
        "id": "kb-trs-real-07",
        "title": "Troubleshooting: Red LOS Light on ONU & Fiber Cable Care",
        "slug": "troubleshooting-red-los-light-onu-fiber",
        "category": "troubleshooting",
        "summary": "ONU ডিভাইসে লাল আলো (LOS blinking red) জ্বললে কী করবেন এবং অপটিক্যাল তার কীভাবে সুরক্ষিত রাখবেন।",
        "keywords": ["red light", "los", "blinking", "fiber", "onu", "optical", "signal", "লাল আলো", "ফাইবার", "সমস্যা"],
        "content": (
            "আপনার সার্কেল নেটওয়ার্ক ONU-তে যদি LOS ইন্ডিকেটরে লাল আলো (Red Light) জ্বলে বা ব্লিঙ্ক করে, তার অর্থ হলো ডিভাইসটিতে অপটিক্যাল ফাইবার লাইট সিগন্যাল আসছে না।\n\n"
            "দ্রুত সমাধানের পদক্ষেপসমূহ:\n"
            "১. প্যাচ কর্ড পরীক্ষা: ONU-র নিচের নীল/সবুজ অপটিক্যাল প্যাচ কর্ডটি শক্তভাবে ক্লিক করে লাগানো আছে কিনা দেখুন।\n"
            "২. তারের ভাঁজ পর্যবেক্ষণ: হলুদ রঙের চিকন ফাইবার তারটি কোথাও মারাত্মক ভাঁজ বা দরজার চাপে চ্যাপ্টা হয়েছে কিনা পরীক্ষা করুন। ফাইবার গ্লাস তার কোকের ক্যানের ব্যাসার্ধের চেয়ে বেশি বাঁকানো যাবে না।\n"
            "৩. ডিভাইসের পাওয়ার রিস্টার্ট: ONU ও রাউটার ১০ সেকেন্ড বন্ধ রেখে পুনরায় চালু করুন।\n"
            "৪. এক্সটার্নাল ড্রপ ক্যাবল ফল্ট: ঘরের ভেতরের তার ঠিক থাকলে বাইরের পোস্ট বা রাস্তায় ড্রপ তার ছিঁড়ে যেতে পারে। সেক্ষেত্রে অনতিবিলম্বে সার্কেল এআই-কে ফিল্ড টেকনিশিয়ান টিকিট খুলতে বলুন অথবা হেল্পলাইন ১৬২০৭-এ কল করুন।"
        )
    },
    {
        "id": "kb-rtr-real-08",
        "title": "Wi-Fi Router PPPoE Setup & Gaming Latency Optimization (DNS & MTU)",
        "slug": "router-pppoe-setup-gaming-latency-dns",
        "category": "router_setup",
        "summary": "TP-Link, Tenda, D-Link রাউটারে PPPoE কনফিগারেশন, MTU 1492 এবং গেমিং লো পিং অপটিমাইজেশন।",
        "keywords": ["router", "setup", "pppoe", "mtu", "dns", "gaming", "ping", "latency", "tp-link", "tenda", "রাউটার"],
        "content": (
            "সার্কেল নেটওয়ার্ক ফাইবার সংযোগে নতুন ওয়াই-ফাই রাউটার সেটআপের নির্দেশিকা:\n\n"
            "১. রাউটার কানেকশন: ONU-র LAN পোর্ট থেকে আসা ক্যাট-৬ ক্যাবলটি আপনার ওয়াই-ফাই রাউটারের WAN (নীল/হলুদ) পোর্টে লাগান।\n"
            "২. অ্যাডমিন প্যানেলে প্রবেশ: ব্রাউজারে 192.168.0.1 অথবা 192.168.1.1 লিখে প্রবেশ করুন।\n"
            "৩. WAN কানেকশন টাইপ: 'PPPoE' নির্বাচন করুন।\n"
            "৪. ইউজারনেম ও পাসওয়ার্ড: সংযোগের সময় সার্কেল নেটওয়ার্কের এসএমএসে প্রেরিত PPPoE Username ও Password ইনপুট দিন।\n"
            "৫. MTU সেটিংস: সার্কেল নেটওয়ার্কের জন্য পারফেক্ট MTU সাইজ হলো 1492।\n"
            "৬. গেমিং লো-পিং ও ডিএনএস: Primary DNS হিসেবে 1.1.1.1 (Cloudflare) এবং Secondary DNS হিসেবে 8.8.8.8 (Google) সেট করুন। Valorant, PUBG, CS2 গেম খেলার সময় ২.৪ গিগাহার্টজের বদলে ৫ গিগাহার্টজ (5GHz) ব্যান্ড অথবা ক্যাবল কানেকশন ব্যবহার করুন।"
        )
    }
]


# -----------------------------------------------------------------------------
# Vector Math & Text Chunking Helpers
# -----------------------------------------------------------------------------

def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Computes exact cosine similarity between two float vectors in pure Python."""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = 0.0
    norm_a = 0.0
    norm_b = 0.0
    for x, y in zip(a, b):
        dot += x * y
        norm_a += x * x
        norm_b += y * y
    if norm_a <= 0.0 or norm_b <= 0.0:
        return 0.0
    return dot / (math.sqrt(norm_a) * math.sqrt(norm_b))


def chunk_text(text: str, max_chunk_size: int = 450, overlap: int = 80) -> List[str]:
    """
    Splits document text into coherent semantic chunks preserving sentence boundaries.
    """
    clean_text = text.strip()
    if not clean_text:
        return []

    # Split on paragraphs or double newlines first
    paragraphs = [p.strip() for p in re.split(r'\n\s*\n', clean_text) if p.strip()]
    chunks = []
    current_chunk = []
    current_len = 0

    for p in paragraphs:
        p_len = len(p)
        if current_len + p_len <= max_chunk_size:
            current_chunk.append(p)
            current_len += p_len + 1
        else:
            if current_chunk:
                chunks.append("\n\n".join(current_chunk))
            # If paragraph itself is longer than max_chunk_size, split by sentences
            if p_len > max_chunk_size:
                sentences = re.split(r'(?<=[।?!.\n])\s+', p)
                sub_chunk = []
                sub_len = 0
                for s in sentences:
                    s = s.strip()
                    if not s:
                        continue
                    if sub_len + len(s) <= max_chunk_size:
                        sub_chunk.append(s)
                        sub_len += len(s) + 1
                    else:
                        if sub_chunk:
                            chunks.append(" ".join(sub_chunk))
                        sub_chunk = [s]
                        sub_len = len(s)
                if sub_chunk:
                    chunks.append(" ".join(sub_chunk))
                current_chunk = []
                current_len = 0
            else:
                current_chunk = [p]
                current_len = p_len

    if current_chunk:
        chunks.append("\n\n".join(current_chunk))

    return chunks if chunks else [clean_text]


# -----------------------------------------------------------------------------
# Google Gen AI Embedding Generator
# -----------------------------------------------------------------------------

def generate_embedding(text: str) -> List[float]:
    """
    Generates semantic embedding vector for a given text snippet using Google Gen AI SDK.
    Configured model: settings.GEMINI_EMBEDDING_MODEL (gemini-embedding-001, dim: 768).
    Includes deterministic fallback if network or API key is temporarily unavailable.
    """
    trimmed = text.strip()
    if not trimmed:
        return [0.0] * settings.EMBEDDING_DIMENSION

    # Try Google Gen AI Client
    if settings.GEMINI_API_KEY and not settings.GEMINI_API_KEY.startswith("test-"):
        try:
            from google import genai
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            model_name = settings.GEMINI_EMBEDDING_MODEL
            # Ensure model prefix
            if not model_name.startswith("models/") and not model_name.startswith("gemini-"):
                model_name = f"models/{model_name}"

            res = client.models.embed_content(
                model=model_name,
                contents=trimmed[:2000],
                config={"output_dimensionality": settings.EMBEDDING_DIMENSION}
            )
            if res and res.embeddings and len(res.embeddings) > 0:
                values = list(res.embeddings[0].values)
                # Pad or slice to target dimension
                if len(values) > settings.EMBEDDING_DIMENSION:
                    values = values[:settings.EMBEDDING_DIMENSION]
                elif len(values) < settings.EMBEDDING_DIMENSION:
                    values = values + [0.0] * (settings.EMBEDDING_DIMENSION - len(values))
                return values
        except Exception as e:
            logger.warning(f"Google Gen AI embedding call notice ({settings.GEMINI_EMBEDDING_MODEL}): {e}. Using deterministic semantic vector.")

    # High-quality deterministic fallback vector based on character and token n-grams
    return _generate_fallback_embedding(trimmed, settings.EMBEDDING_DIMENSION)


def _generate_fallback_embedding(text: str, dim: int = 768) -> List[float]:
    """Deterministic hash-based dense embedding fallback preserving basic lexical similarities."""
    import hashlib
    vec = [0.0] * dim
    words = re.findall(r'\w+', text.lower())
    if not words:
        words = [text.lower()]

    for idx, word in enumerate(words):
        # 3 distinct hash projections
        h1 = int(hashlib.md5(word.encode()).hexdigest(), 16)
        h2 = int(hashlib.sha1(word.encode()).hexdigest(), 16)
        pos1 = h1 % dim
        pos2 = (h1 >> 8) % dim
        pos3 = (h2 >> 4) % dim
        val = 1.0 / math.sqrt(idx + 1)
        vec[pos1] += val
        vec[pos2] += val * 0.5
        vec[pos3] += val * 0.25

    # L2 normalize
    norm = math.sqrt(sum(v * v for v in vec))
    if norm > 0:
        vec = [v / norm for v in vec]
    return vec


# -----------------------------------------------------------------------------
# Document Indexing and Chunking Pipeline
# -----------------------------------------------------------------------------

async def index_document(doc: KnowledgeDocument, db: AsyncSession) -> int:
    """
    Chunks document, generates vector embeddings for document and chunks, and persists them.
    Returns the number of chunks created.
    """
    # 1. Generate document-level summary embedding
    doc_text_for_embed = f"{doc.title}\n{doc.category}\n{doc.summary or ''}\n{' '.join(doc.keywords or [])}\n{doc.content[:800]}"
    doc.embedding = generate_embedding(doc_text_for_embed)

    # 2. Delete any existing chunks for this document
    await db.execute(delete(KnowledgeChunk).where(KnowledgeChunk.document_id == doc.id))

    # 3. Create fine-grained chunks
    chunks_text = chunk_text(doc.content, max_chunk_size=500, overlap=80)
    if not chunks_text:
        chunks_text = [doc.content]

    created_chunks = []
    for c_idx, c_text in enumerate(chunks_text):
        chunk_embed = generate_embedding(f"{doc.title}: {c_text}")
        chunk = KnowledgeChunk(
            id=f"chk-{str(uuid.uuid4())[:8]}",
            document_id=doc.id,
            chunk_index=c_idx,
            content=c_text,
            embedding=chunk_embed,
        )
        created_chunks.append(chunk)
        db.add(chunk)

    await db.flush()
    return len(created_chunks)


# -----------------------------------------------------------------------------
# Semantic Search & Hybrid Retrieval
# -----------------------------------------------------------------------------

async def semantic_search(
    query: str,
    category: Optional[str] = None,
    top_k: int = 4,
    min_score: float = 0.2,
    db: Optional[AsyncSession] = None
) -> List[Dict[str, Any]]:
    """
    Performs hybrid semantic vector and keyword search across indexed Circle Network documents and chunks.
    Compatible with PostgreSQL (pgvector or pure-cosine fallback) and SQLite.
    """
    clean_query = query.strip()
    if not clean_query:
        return []

    query_vec = generate_embedding(clean_query)
    query_terms = [t.lower() for t in re.findall(r'\w+', clean_query) if len(t) > 2]

    # Use database if session is provided or open a local session
    async def _query_with_session(session: AsyncSession):
        stmt = select(KnowledgeDocument).where(KnowledgeDocument.is_published == True)
        if category and category != "all":
            stmt = stmt.where(KnowledgeDocument.category == category)
        res = await session.execute(stmt)
        docs = res.scalars().all()

        scored_results = []
        for doc in docs:
            # Document-level cosine similarity
            doc_score = 0.0
            if doc.embedding and isinstance(doc.embedding, list):
                doc_score = cosine_similarity(query_vec, doc.embedding)

            # Keyword relevance boost
            kw_score = 0.0
            text_lower = f"{doc.title} {doc.summary or ''} {' '.join(doc.keywords or [])} {doc.content}".lower()
            for term in query_terms:
                if term in doc.title.lower():
                    kw_score += 0.25
                elif any(term in k.lower() for k in (doc.keywords or [])):
                    kw_score += 0.15
                elif term in text_lower:
                    kw_score += 0.05

            combined_doc_score = (doc_score * 0.7) + min(kw_score, 0.3)

            # Check chunk-level matches for higher precision snippets
            best_chunk_text = doc.content[:400]
            best_chunk_score = combined_doc_score

            if doc.chunks:
                for chk in doc.chunks:
                    if chk.embedding and isinstance(chk.embedding, list):
                        chk_sim = cosine_similarity(query_vec, chk.embedding)
                        # Check keyword match in chunk
                        c_kw = sum(0.08 for term in query_terms if term in chk.content.lower())
                        total_chk = (chk_sim * 0.75) + min(c_kw, 0.25)
                        if total_chk > best_chunk_score:
                            best_chunk_score = total_chk
                            best_chunk_text = chk.content

            if best_chunk_score >= min_score:
                scored_results.append({
                    "id": doc.id,
                    "document_id": doc.id,
                    "title": doc.title,
                    "category": doc.category,
                    "slug": doc.slug,
                    "content": doc.content,
                    "snippet": best_chunk_text.strip(),
                    "similarity_score": round(best_chunk_score, 4),
                    "source_reference": f"[Source: {doc.title} ({doc.category.replace('_', ' ').title()})]",
                })

        scored_results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return scored_results[:top_k]

    if db is not None:
        return await _query_with_session(db)
    else:
        async with AsyncSessionLocal() as session:
            return await _query_with_session(session)


# -----------------------------------------------------------------------------
# RAG Context Generator for AI Agent Prompt Injection
# -----------------------------------------------------------------------------

async def get_rag_context(query: str, db: Optional[AsyncSession] = None, top_k: int = 3) -> str:
    """
    Retrieves grounded Circle Network knowledge snippets and formats them for injection
    into Gemini's system instructions with authoritative citations.
    """
    results = await semantic_search(query, top_k=top_k, min_score=0.25, db=db)
    if not results:
        return ""

    context_lines = [
        "### AUTHORITATIVE CIRCLE NETWORK KNOWLEDGE BASE CONTEXT (GROUND TRUTH):",
        "Use ONLY the verified ISP information below when answering questions about Circle Network packages, prices, speeds, policies, payment methods, or company details. Do not invent contradictory numbers or facts.\n"
    ]

    for idx, r in enumerate(results, start=1):
        context_lines.append(f"--- Document #{idx}: {r['title']} ({r['category']}) ---")
        context_lines.append(f"{r['snippet']}\n")

    return "\n".join(context_lines)


# -----------------------------------------------------------------------------
# In-memory Legacy Fallback Search
# -----------------------------------------------------------------------------

def search_knowledge_base(query: str, top_k: int = 3) -> List[Dict[str, Any]]:
    """Fast synchronous fallback keyword search for offline or uninitialized scenarios."""
    terms = [t.lower() for t in query.split() if len(t) > 2]
    scored = []

    for item in REAL_CIRCLE_KNOWLEDGE_ARTICLES:
        score = 0
        text_lower = (item["title"] + " " + item["content"]).lower()
        for term in terms:
            if term in item["title"].lower():
                score += 5
            elif any(term in k.lower() for k in item.get("keywords", [])):
                score += 3
            elif term in text_lower:
                score += 1
        if score > 0:
            scored.append((score, item))

    scored.sort(key=lambda x: x[0], reverse=True)
    if not scored:
        return REAL_CIRCLE_KNOWLEDGE_ARTICLES[:top_k]
    return [item for _, item in scored[:top_k]]
