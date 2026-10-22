import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  CheckCircle2,
  AlertTriangle,
  Award,
  Globe,
  GraduationCap,
  Calendar,
  DollarSign,
  HelpCircle,
  Lightbulb,
  ArrowRight,
  Headphones,
  FileText,
  Mic,
  PenTool,
  Sparkles,
  MapPin,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { soundManager } from '../utils/audioEffects';

interface BanglaIELTSGuideProps {
  onNavigateToModule?: (moduleId: string) => void;
  onShowToast: (msg: string) => void;
}

export const BanglaIELTSGuide: React.FC<BanglaIELTSGuideProps> = ({
  onNavigateToModule,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<string>('intro');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const sections = [
    { id: 'intro', label: '১. আইইএলটিএস কী ও কেন?', icon: BookOpen },
    { id: 'types', label: '২. একাডেমিক বনাম জেনারেল', icon: GraduationCap },
    { id: 'fees', label: '৩. বাংলাদেশে ফি ও রেজিস্ট্রেশন', icon: MapPin },
    { id: 'format', label: '৪. কম্পিউটার বনাম পেপার টেস্ট', icon: Clock },
    { id: 'modules', label: '৫. ৪টি মডিউলের বিস্তারিত', icon: Award },
    { id: 'mistakes', label: '৬. বাংলাদেশীদের সাধারণ ভুল ও সমাধান', icon: ShieldAlert },
    { id: 'roadmap', label: '৭. ৬০ দিনের স্টাডি প্ল্যান', icon: Calendar },
    { id: 'faq', label: '৮. প্রয়োজনীয় প্রশ্নোত্তর (FAQ)', icon: HelpCircle }
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    soundManager.playBeep(600, 0.05);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Hero Banner with Bangladeshi Flag Accent */}
      <div className="bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
        {/* Subtle background red circle mimicking the Bangladesh flag motif */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-rose-600/20 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold font-mono">
            <span>🇧🇩</span>
            <span>বাংলাদেশী শিক্ষার্থীদের জন্য বিশেষায়িত মাস্টারগাইড</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            IELTS A-Z: বাংলাদেশীদের জন্য সম্পূর্ণ গাইড ও প্রস্তুতি নির্দেশিকা
          </h2>

          <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
            ব্রিটিশ কাউন্সিল ও আইডিপি বাংলাদেশের পরীক্ষার নিয়ম, পাসপোর্ট বাধ্যবাধকতা, কম্পিউটার বনাম পেপার টেস্টের আসল সত্য, মুখস্থ টেমপ্লেটের ফাঁদ থেকে মুক্তি এবং Band 7.5+ অর্জনের কার্যকর বাংলা রূপরেখা।
          </p>

          {/* Quick jump badges */}
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="px-3 py-1 rounded-xl bg-white/10 text-xs font-semibold text-emerald-200 border border-white/10">
              রেজিস্ট্রেশন ফি: ~৩১,০০০–৩৩,০০০৳
            </span>
            <span className="px-3 py-1 rounded-xl bg-white/10 text-xs font-semibold text-emerald-200 border border-white/10">
              মূল পাসপোর্ট বাধ্যতামূলক
            </span>
            <span className="px-3 py-1 rounded-xl bg-white/10 text-xs font-semibold text-emerald-200 border border-white/10">
              কম্পিউটার টেস্ট রেজাল্ট: ১–৫ দিন
            </span>
            <span className="px-3 py-1 rounded-xl bg-white/10 text-xs font-semibold text-amber-300 border border-amber-400/30">
              One Skill Retake (OSR) গ্রহণযোগ্য
            </span>
          </div>
        </div>
      </div>

      {/* Horizontal Nav Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = activeTab === s.id;
            return (
              <button
                key={s.id}
                onClick={() => handleTabChange(s.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 border ${
                  isActive
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-300' : 'text-slate-500'}`} />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: What is IELTS */}
      {activeTab === 'intro' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-emerald-700 uppercase font-mono">Module 14.1 · Introduction</span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                আইইএলটিএস (IELTS) কী এবং কেন এটি আপনার প্রয়োজন?
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                International English Language Testing System — বিশ্বের সবচেয়ে বিশ্বস্ত ও স্বীকৃত ইংরেজি ভাষার দক্ষতা মূল্যায়ন পরীক্ষা।
              </p>
            </div>

            <div className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-700 leading-relaxed space-y-4 font-sans">
              <p>
                <strong>IELTS</strong> যৌথভাবে পরিচালনা করে তিনটি স্বনামধন্য প্রতিষ্ঠান: <strong>British Council</strong>, <strong>IDP: IELTS Australia</strong>, এবং <strong>Cambridge Assessment English</strong>। আপনি ব্রিটিশ কাউন্সিল অথবা আইডিপি—যার মাধ্যমেই পরীক্ষা দেন না কেন, পরীক্ষার প্রশ্নপত্রের মান, মূল্যায়ন পদ্ধতি এবং সনদের মান <strong>শতভাগ একই</strong>।
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">১</div>
                  <h4 className="font-bold text-slate-900 text-sm">উচ্চশিক্ষা ও স্কলারশিপ</h4>
                  <p className="text-xs text-slate-600">
                    UK, USA, Canada, Australia, Germany ও ইউরোপের নামকরা বিশ্ববিদ্যালয়গুলোতে ব্যাচেলর, মাস্টার্স বা পিএইচডি ভর্তির প্রধান শর্ত। ফুল-ফান্ডেড স্কলারশিপের (যেমন Chevening, Commonwealth, Erasmus Mundus) জন্য Band 7.0+ আবশ্যক।
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">২</div>
                  <h4 className="font-bold text-slate-900 text-sm">স্থায়ী অভিবাসন (PR)</h4>
                  <p className="text-xs text-slate-600">
                    কানাডার Express Entry (CRS Score বৃদ্ধি করতে CLB 9 তথা L:8, R:7, W:7, S:7 প্রয়োজন) এবং অস্ট্রেলিয়ার Skilled Migration ভিসার জন্য জেনারেল ট্রেনিং IELTS বাধ্যতামূলক।
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">৩</div>
                  <h4 className="font-bold text-slate-900 text-sm">গ্লোবাল ক্যারিয়ার</h4>
                  <p className="text-xs text-slate-600">
                    আন্তর্জাতিক এনজিও, মাল্টিন্যাশনাল কোম্পানি এবং বিদেশে ডাক্তার/নার্সদের প্রফেশনাল রেজিস্ট্রেশনের ক্ষেত্রে ইংরেজি দক্ষতার একমাত্র গ্লোবাল মাপকাঠি।
                  </p>
                </div>
              </div>

              {/* 9-Band Scale Breakdown */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 mt-4">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>আইইএলটিএস ব্যান্ড স্কেল (১.০ থেকে ৯.০ এর অর্থ):</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <strong>Band 9.0 (Expert User):</strong> ইংরেজি ভাষায় পরিপূর্ণ সাবলীলতা ও নির্ভুল প্রয়োগ।
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <strong>Band 8.0 - 8.5 (Very Good User):</strong> চমৎকার দখল; জটিল ও তাত্ত্বিক আলোচনায় পারদর্শী।
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <strong>Band 7.0 - 7.5 (Good User):</strong> অধিকাংশ ভালো বিশ্ববিদ্যালয়ের সাধারণ রিকোয়ারমেন্ট।
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <strong>Band 6.0 - 6.5 (Competent User):</strong> দৈনন্দিন ইংরেজি ভালো পারেন, তবে মাঝেমধ্যে ব্যাকরণগত জটিলতা ঘটে।
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Academic vs General Training */}
      {activeTab === 'types' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-emerald-700 uppercase font-mono">Module 14.2 · Formats</span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                Academic বনাম General Training — আপনার কোনটি দেওয়া উচিত?
              </h3>
            </div>

            {/* Critical Notification Banner */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">গুরুত্বপূর্ণ তথ্য (যা অনেকে জানেন না):</strong>
                আইইএলটিএস <strong>Listening</strong> এবং <strong>Speaking</strong> মডিউল দুটি Academic এবং General Training—উভয়ের জন্যই <strong>১০০% এক ও অভিন্ন</strong>! পার্থক্য শুধুমাত্র <em>Reading</em> এবং <em>Writing Task 1</em> এ।
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Academic Column */}
              <div className="p-5 rounded-2xl border-2 border-emerald-600 bg-emerald-50/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-base text-emerald-950">Academic IELTS</h4>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold text-[10px]">
                    উচ্চশিক্ষার জন্য
                  </span>
                </div>
                <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span><strong>কার জন্য:</strong> ব্যাচেলর, মাস্টার্স বা পিএইচডি প্রোগ্রামে ভর্তি হতে ইচ্ছুক শিক্ষার্থী।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span><strong>Reading:</strong> ৩টি দীর্ঘ ও গবেষণামূলক একাডেমিক প্রবন্ধ (বিজ্ঞানের অগ্রগতি, ইতিহাস, মনোবিজ্ঞান ইত্যাদি)।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span><strong>Writing Task 1:</strong> গ্রাফ, চার্ট, ম্যাপ বা প্রক্রিয়া চিত্রের (Process Diagram) ডাটা বিশ্লেষণ (১৫০ শব্দ, ২০ মিনিট)।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span><strong>Writing Task 2:</strong> সামাজিক বা শিক্ষামূলক বিষয়ে ২৫০ শব্দের ফর্মাল প্রবন্ধ।</span>
                  </li>
                </ul>
              </div>

              {/* General Training Column */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-base text-slate-900">General Training (GT)</h4>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold text-[10px]">
                    ইমিগ্রেশন ও চাকরির জন্য
                  </span>
                </div>
                <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <span><strong>কার জন্য:</strong> কানাডা এক্সপ্রেস এন্ট্রি, অস্ট্রেলিয়া পিআর ভিসা বা ওয়ার্ক পারমিট প্রত্যাশী।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <span><strong>Reading:</strong> কর্মক্ষেত্র ও প্রাত্যহিক জীবনের ছোট ছোট বিজ্ঞাপন, নোটিশ, লিফলেট এবং ১টি সাধারণ প্রবন্ধ।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <span><strong>Writing Task 1:</strong> ফরমাল, সেমি-ফরমাল বা ইনফরমাল চিঠি (Letter Writing) লেখা (১৫০ শব্দ, ২০ মিনিট)।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <span><strong>Writing Task 2:</strong> ২৫০ শব্দের সাধারণ মতামতধর্মী রচনা (Academic এর মতোই)।</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Bangladesh Registration & Fees */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-emerald-700 uppercase font-mono">Module 14.3 · Bangladesh Guidelines</span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                বাংলাদেশে আইইএলটিএস রেজিস্ট্রেশন, ফি ও সেন্টার নির্দেশিকা
              </h3>
            </div>

            {/* Passport Mandate Alert */}
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-xs text-rose-950 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="font-extrabold text-sm text-rose-900">জরুরি পরীক্ষার দিন নিয়ম: মূল পাসপোর্ট বাধ্যতামূলক!</strong>
                <p className="leading-relaxed">
                  পরীক্ষার দিন অবশ্যই <strong>আসল ভ্যালিড পাসপোর্ট (Original Passport)</strong> সাথে নিয়ে সেন্টারে প্রবেশ করতে হবে। পাসপোর্ট ছাড়া কোনো ফটোকপি, নোটারি করা কপি, জাতীয় পরিচয়পত্র (NID) বা জন্মনিবন্ধন দিয়ে পরীক্ষা দেওয়া <strong>সম্পূর্ণ অসম্ভব</strong> এবং ফি ফেরত দেওয়া হয় না।
                </p>
              </div>
            </div>

            {/* Fees and payment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>রেজিস্ট্রেশন ফি (আনুমানিক ২০২৬)</span>
                </h4>
                <ul className="text-xs space-y-2 text-slate-600 leading-relaxed">
                  <li><strong>IELTS on Computer (CD):</strong> প্রায় ৩১,০০০ – ৩৩,০০০ টাকা।</li>
                  <li><strong>IELTS on Paper:</strong> প্রায় ৩১,০০০ – ৩৩,০০০ টাকা।</li>
                  <li><strong>IELTS for UKVI:</strong> প্রায় ৩৫,০০০ – ৩৭,০০০ টাকা (UK ভিসার জন্য)।</li>
                  <li><strong>পেমেন্ট পদ্ধতি:</strong> ভিসা (Visa), মাস্টারকার্ড (MasterCard), অথবা নির্দিষ্ট স্ট্যান্ডার্ড চার্টার্ড / এইচএসবিসি ব্যাংকের বুথে নগদ জমা।</li>
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>পরীক্ষার প্রধান শহর ও টেস্ট সেন্টার</span>
                </h4>
                <ul className="text-xs space-y-2 text-slate-600 leading-relaxed">
                  <li><strong>ঢাকা:</strong> গুলশান, ধানমন্ডি, বনানী, উত্তরা (British Council ও IDP উভয় সেন্টারেই নিয়মিত পরীক্ষা হয়)।</li>
                  <li><strong>চট্টগ্রাম:</strong> জিইসি মোড়, আগ্রাবাদ।</li>
                  <li><strong>সিলেট:</strong> জিন্দাবাজার ও উপশহর এলাকা।</li>
                  <li><strong>অন্যান্য শহর:</strong> রাজশাহী, খুলনা, কুমিল্লা, বরিশাল (সেশন অনুযায়ী নির্ধারিত)।</li>
                </ul>
              </div>
            </div>

            {/* Test day survival tips */}
            <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-3">
              <h4 className="font-bold text-blue-950 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-700" />
                <span>টেস্ট-ডে প্রয়োজনীয় নিয়মাবলী</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-blue-900">
                <div className="p-3 rounded-xl bg-white border border-blue-100">
                  <strong>পানির বোতল:</strong> কোনো লেবেল ছাড়া সম্পূর্ণ স্বচ্ছ (Transparent) প্লাস্টিকের পানির বোতল ভেতরে নেওয়া যায়।
                </div>
                <div className="p-3 rounded-xl bg-white border border-blue-100">
                  <strong>ইলেকট্রনিক ডিভাইস:</strong> মোবাইল, স্মার্টওয়াচ বা ব্লুটুথ ডিভাইস সেন্টারের নির্ধারিত লকারে জমা রাখতে হবে।
                </div>
                <div className="p-3 rounded-xl bg-white border border-blue-100">
                  <strong>সময়ানুবর্তিতা:</strong> পরীক্ষার রিপোর্টিং টাইমের অন্তত ৪৫ মিনিট আগে সেন্টারে পৌঁছানো আবশ্যক (বায়োমেট্রিক ও ছবি তোলার জন্য)।
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Computer vs Paper */}
      {activeTab === 'format' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-emerald-700 uppercase font-mono">Module 14.4 · Mode Comparison</span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                কম্পিউটার-ডেলিভার্ড বনাম পেপার-বেসড: কোনটি আপনার জন্য সুবিধাজনক?
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Computer delivered */}
              <div className="p-5 rounded-2xl bg-emerald-50/50 border-2 border-emerald-500 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-base text-emerald-950">Computer-Delivered IELTS</h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                    সর্বাধিক সুপারিশকৃত ⭐
                  </span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-700 font-bold">✓</span>
                    <span><strong>দ্রুত ফলাফল:</strong> পরীক্ষা শেষ হওয়ার মাত্র <strong>১ থেকে ৫ দিনের মধ্যে</strong> অনলাইন রেজাল্ট প্রকাশিত হয়।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-700 font-bold">✓</span>
                    <span><strong>Writing সুবিধা:</strong> স্ক্রিনে লাইভ ওয়ার্ড কাউন্টার থাকে, কাটাকাটি হয় না, সহজে Copy/Paste ও Edit করা যায়। হাতের লেখা খারাপ হলেও নম্বর কাটার ঝুঁকি নেই।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-700 font-bold">✓</span>
                    <span><strong>Listening সুবিধা:</strong> ব্যক্তিগত নয়েজ-ক্যানসেলিং হেডফোনে অত্যন্ত স্পষ্ট সাউন্ড শোনা যায় এবং ভলিউম নিজের মতো কমানো-বাড়ানো যায়।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-700 font-bold">✓</span>
                    <span><strong>One Skill Retake (OSR):</strong> ভবিষ্যতে কোনো একটি মডিউলে খারাপ হলে শুধু সেই মডিউলটি পুনরায় দেওয়ার সুবিধা শুধু কম্পিউটার টেস্টেই বিদ্যমান।</span>
                  </li>
                </ul>
              </div>

              {/* Paper based */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-300 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-base text-slate-900">Paper-Based IELTS</h4>
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-bold">
                    ঐতিহ্যবাহী পদ্ধতি
                  </span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 font-bold">•</span>
                    <span><strong>ফলাফল:</strong> রেজাল্ট পেতে ঠিক <strong>১৩ দিন</strong> সময় লাগে।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 font-bold">•</span>
                    <span><strong>Writing সীমাবদ্ধতা:</strong> পেনসিলে লিখতে গিয়ে হাত ব্যথা হয়, শব্দ নিজে নিজে গুণে দেখতে হয়, বারবার ইরেজার দিয়ে মুছতে গিয়ে সময় নষ্ট হয়।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 font-bold">•</span>
                    <span><strong>Listening:</strong> সাধারণত রুমের সাউন্ডবক্স বা সেন্ট্রাল স্পিকারে অডিও বাজে, ফলে কখনো কখনো ইকো বা পেছনের সিটে সমস্যা হতে পারে।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 font-bold">•</span>
                    <span><strong>কাদের জন্য:</strong> যাদের টাইপিং স্পিড খুবই কম (১৫ শব্দের নিচে) অথবা কম্পিউটারের স্ক্রিনে পড়তে অসুবিধা হয়।</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Four Modules Detailed */}
      {activeTab === 'modules' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-emerald-700 uppercase font-mono">Module 14.5 · Structure</span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                ৪টি মডিউলের সময় বণ্টন ও প্রশ্ন প্যাটার্ন
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Listening */}
              <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Headphones className="w-4 h-4 text-blue-700" />
                    <span>Listening (শ্রবণ দক্ষতা) · ৩০ মিনিট</span>
                  </h4>
                  <span className="text-xs font-mono font-bold text-blue-700">৪০টি প্রশ্ন</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  ৪টি পার্টে বিভক্ত। অডিও একবারই বাজানো হয়। পার্ট ১: দুজন ব্যক্তির টেলিফোন বা তথ্যমূলক সংলাপ; পার্ট ২: সামাজিক বিষয়ের একক বক্তব্য (যেমন মিউজিয়াম ট্যুর বা ম্যাপ); পার্ট ৩: ২-৩ জন শিক্ষার্থীর প্রজেক্ট ডিসকাশন; পার্ট ৪: একাডেমিক একক লেকচার।
                </p>
                {onNavigateToModule && (
                  <button
                    onClick={() => onNavigateToModule('listening')}
                    className="text-xs text-blue-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <span>Listening Lab & Map প্র্যাকটিস করুন</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Reading */}
              <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-700" />
                    <span>Reading (পঠন দক্ষতা) · ৬০ মিনিট</span>
                  </h4>
                  <span className="text-xs font-mono font-bold text-emerald-700">৪০টি প্রশ্ন</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  ৩টি দীর্ঘ প্যাসেজ (প্যাসেজ ১, ২, এবং ৩)। কোনো অতিরিক্ত ট্রান্সফার টাইম দেওয়া হয় না। প্রশ্ন ধরনের মধ্যে রয়েছে: True/False/Not Given, Heading Matching, Summary Completion, Multiple Choice Questions।
                </p>
                {onNavigateToModule && (
                  <button
                    onClick={() => onNavigateToModule('reading')}
                    className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <span>Reading Lab & CEFR স্ক্যানারে যান</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Writing */}
              <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-purple-700" />
                    <span>Writing (লিখন দক্ষতা) · ৬০ মিনিট</span>
                  </h4>
                  <span className="text-xs font-mono font-bold text-purple-700">টাস্ক ১ ও ২</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  টাস্ক ১ (২০ মিনিট, ১৫০ শব্দ): গ্রাফ বা তথ্যের ডাটা বিশ্লেষণ (Academic) বা চিঠি (GT)। টাস্ক ২ (৪০ মিনিট, ২৫০ শব্দ): মতামতধর্মী বা সমস্যা-সমাধানমূলক ডিসকার্সিভ রচনা। ক্যামব্রিজের ৪টি ক্রাইটেরিয়ায় (TR, CC, LR, GRA) মূল্যায়ন হয়।
                </p>
                {onNavigateToModule && (
                  <button
                    onClick={() => onNavigateToModule('arguments')}
                    className="text-xs text-purple-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <span>PESTLE Argument Engine ব্যবহার করুন</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Speaking */}
              <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Mic className="w-4 h-4 text-amber-700" />
                    <span>Speaking (মৌখিক সাক্ষাৎকার) · ১১-১৪ মিনিট</span>
                  </h4>
                  <span className="text-xs font-mono font-bold text-amber-700">৩টি পার্ট</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  পার্ট ১ (৪-৫ মিনিট): পরিচিত সাধারণ প্রশ্নোত্তর (হোমটাউন, পড়াশোনা, শখ)। পার্ট ২ (৩-৪ মিনিট): কিউ কার্ড (১ মিনিট প্রস্তুতি ও ২ মিনিট একটানা মনোলগ)। পার্ট ৩ (৪-৫ মিনিট): বিমূর্ত সামাজিক বিশ্লেষণমূলক আলোচনা।
                </p>
                {onNavigateToModule && (
                  <button
                    onClick={() => onNavigateToModule('examiner')}
                    className="text-xs text-amber-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <span>Voice Examiner এ প্র্যাকটিস করুন</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: Common Bangladeshi Mistakes & Traps */}
      {activeTab === 'mistakes' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-rose-700 uppercase font-mono">Module 14.6 · Diagnostics</span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                বাংলাদেশী শিক্ষার্থীদের ৪টি প্রধান ভুল এবং উত্তরণের উপায়
              </h3>
            </div>

            <div className="space-y-4">
              {/* Mistake 1 */}
              <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-rose-950 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-rose-600 text-white text-xs flex items-center justify-center font-mono">১</span>
                    <span>রাইটিংয়ে মুখস্থ টেমপ্লেট ব্যবহার (The Memorized Template Trap)</span>
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">
                    Band 5.5 ফাঁদ
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  <strong>সমস্যা:</strong> কোচিং সেন্টারের শেখানো <em>"In this modern era of science and technology, a hotly debated topic has emerged..."</em> টাইপের ক্লিশে মুখস্থ টেমপ্লেট দেখলে ক্যামব্রিজ এক্সামিনাররা সরাসরি Task Response ও Coherence-এ ৫.০ বা ৫.৫ বসিয়ে দেন।
                </p>
                <div className="p-3 rounded-xl bg-white border border-rose-200 text-xs text-emerald-900 font-medium">
                  <strong>সঠিক সমাধান:</strong> টেমপ্লেট নয়, প্যারাগ্রাফের গঠন বুঝুন। প্রথম বাক্যে প্রশ্নকে নিজের শব্দে প্যারাফ্রেজ করুন, এরপর মূল যুক্তি দিন এবং বাস্তব উদাহরণ দিয়ে ব্যাখ্যা সম্পন্ন করুন।
                </div>
              </div>

              {/* Mistake 2 */}
              <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-amber-950 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs flex items-center justify-center font-mono">২</span>
                    <span>স্পিকিংয়ে অতিরিক্ত কৃত্রিম এক্সেন্ট নকলের চেষ্টা (Fake Accent Syndrome)</span>
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                    Hesitation বৃদ্ধি
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  <strong>সমস্যা:</strong> জোর করে ব্রিটিশ বা আমেরিকান একসেন্ট দেখাতে গিয়ে শিক্ষার্থীরা আটকে যায়, ফ্লুয়েন্সি নষ্ট হয় এবং প্রচুর ফিলার ওয়ার্ড (uh, umm, actually, like) ব্যবহার করে।
                </p>
                <div className="p-3 rounded-xl bg-white border border-amber-200 text-xs text-emerald-900 font-medium">
                  <strong>সঠিক সমাধান:</strong> আইইএলটিএস অফিসিয়াল নীতিমালায় স্পষ্ট বলা আছে: <em>"Any natural international accent is completely acceptable."</em> আপনার দেশীয় একসেন্ট নিয়ে দ্বিধাহীন থাকুন; স্পষ্ট উচ্চারণ ও মসৃণ সাবলীলতাই আসল।
                </div>
              </div>

              {/* Mistake 3 */}
              <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-blue-950 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-mono">৩</span>
                    <span>রিডিংয়ে প্রতিটি শব্দ পড়ে অনুবাদ করার ব্যর্থ চেষ্টা (Translating in Head)</span>
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                    সময় স্বল্পতা
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  <strong>সমস্যা:</strong> ৩টি প্যাসেজের ২৭০০+ শব্দের প্রতিটি বাক্য মাথায় বাংলায় অনুবাদ করে বোঝার চেষ্টা করলে ৬০ মিনিটে কখনোই ৪০টি প্রশ্ন শেষ করা সম্ভব হয় না।
                </p>
                <div className="p-3 rounded-xl bg-white border border-blue-200 text-xs text-emerald-900 font-medium">
                  <strong>সঠিক সমাধান:</strong> Skimming (প্যারাগ্রাফের মূল বক্তব্য বোঝা) এবং Scanning (প্রশ্নপত্রের কী-ওয়ার্ড টেক্সটে দ্রুত খুঁজে বের করা) টেকনিক প্রয়োগ করুন।
                </div>
              </div>

              {/* Mistake 4 */}
              <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-purple-950 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-mono">৪</span>
                    <span>লিসেনিংয়ে স্পেলিং ও সেলফ-কারেকশন ফাঁদে পা দেওয়া (Distractor Traps)</span>
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                    অনাকাঙ্ক্ষিত মার্ক হারানো
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  <strong>সমস্যা:</strong> স্পিকার প্রথমে একটি ভুল নাম্বার বা তারিখ বলেন ("I live at 24 High Street... Oh wait, sorry, that was my old flat, it is 42 High Street")। দ্রুত লিখতে গিয়ে অনেকেই প্রথম তথ্যটি লিখে ভুল করেন।
                </p>
                <div className="p-3 rounded-xl bg-white border border-purple-200 text-xs text-emerald-900 font-medium">
                  <strong>সঠিক সমাধান:</strong> স্পিকারের পূর্ণ বাক্য শুনুন এবং কোনো শব্দে সন্দেহ হলে ALL-CAPITAL অক্ষরে উত্তর ইনপুট দিন যাতে হাতের লেখার কারণে স্পেলিং ভুল না হয়।
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: 60-Day Study Roadmap */}
      {activeTab === 'roadmap' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-emerald-700 uppercase font-mono">Module 14.7 · Action Plan</span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                Band 7.5+ অর্জনে ৬০ দিনের স্বয়ংসম্পূর্ণ স্টাডি রুটিন
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phase 1 */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-mono text-xs font-bold">
                    সপ্তাহ ১ ও ২ (দিন ১–১৪)
                  </span>
                  <span className="text-xs font-bold text-slate-500">ফাউন্ডেশন ও ফরম্যাট পরিচিতি</span>
                </div>
                <ul className="text-xs text-slate-700 space-y-2">
                  <li>• আমাদের <strong>Beginner 101</strong> ও <strong>Slide Guide</strong> মডিউল সম্পূর্ণ শেষ করুন।</li>
                  <li>• প্রতিদিন BBC 6-Minute English ও ব্রিটিশ পডকাস্ট শুনে অ্যাকসেন্টের সাথে পরিচিত হন।</li>
                  <li>• <strong>Vocab Deck</strong> থেকে প্রতিদিন ২০টি একাডেমিক কোলোকেশন আয়ত্ত করুন।</li>
                </ul>
              </div>

              {/* Phase 2 */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono text-xs font-bold">
                    সপ্তাহ ৩ ও ৪ (দিন ১৫–২৮)
                  </span>
                  <span className="text-xs font-bold text-slate-500">Listening & Reading মাস্টারি</span>
                </div>
                <ul className="text-xs text-slate-700 space-y-2">
                  <li>• <strong>Listening Lab</strong> এ ম্যাপ ও ডিরেকশনাল ল্যাঙ্গুয়েজ নিখুঁত করুন।</li>
                  <li>• <strong>Reading Lab</strong> এ প্রতিদিন ১টি করে একাডেমিক প্যাসেজ Skim ও Scan করুন।</li>
                  <li>• যেকোনো ভুল হলে অবিলম্বে <strong>Mistake Vault</strong> এ জমা করে রিভিশন দিন।</li>
                </ul>
              </div>

              {/* Phase 3 */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800 font-mono text-xs font-bold">
                    সপ্তাহ ৫ ও ৬ (দিন ২৯–৪২)
                  </span>
                  <span className="text-xs font-bold text-slate-500">Writing & Speaking ফ্লুয়েন্সি</span>
                </div>
                <ul className="text-xs text-slate-700 space-y-2">
                  <li>• <strong>Task 1 Visualizer</strong> দিয়ে ট্রেন্ড, বৃদ্ধি ও হ্রাসের একাডেমিক ভাষা লিখুন।</li>
                  <li>• <strong>PESTLE Engine</strong> ব্যবহার করে জটিল বিষয়ে রচনার শক্তিশালী পয়েন্ট বানান।</li>
                  <li>• <strong>Voice Examiner</strong> এ প্রতিদিন পার্ট ১, ২ ও ৩ এ কথা বলে AI ফিডব্যাক নিন।</li>
                </ul>
              </div>

              {/* Phase 4 */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-mono text-xs font-bold">
                    সপ্তাহ ৭ ও ৮ (দিন ৪৩–৬০)
                  </span>
                  <span className="text-xs font-bold text-slate-500">ফুল লেন্থ লাইভ মক টেস্ট</span>
                </div>
                <ul className="text-xs text-slate-700 space-y-2">
                  <li>• প্রতি ২ দিন পরপর আমাদের <strong>Live Mock Test</strong> এ অংশ নিন।</li>
                  <li>• পরীক্ষা শেষে <strong>Review Submission</strong> এ মডেল অ্যানসারের সাথে নিজের উত্তর মেলান।</li>
                  <li>• টেস্টের আগের দিন সম্পূর্ণ বিশ্রাম নিন ও পাসপোর্ট ঠিকঠাক গুছিয়ে রাখুন।</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: Frequently Asked Questions */}
      {activeTab === 'faq' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-emerald-700 uppercase font-mono">Module 14.8 · Q&A</span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                বাংলাদেশী শিক্ষার্থীদের সচরাচর জিজ্ঞাসিত প্রশ্নাবলী (FAQ)
              </h3>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <strong className="text-slate-900 font-bold block">
                  প্রশ্ন ১: বাংলাদেশে কি IELTS One Skill Retake (OSR) সুবিধা চালু আছে?
                </strong>
                <p className="text-slate-600 leading-relaxed">
                  <strong>উত্তর:</strong> হ্যাঁ! বাংলাদেশে British Council এবং IDP উভয় সেন্টারের <em>Computer-Delivered</em> পরীক্ষায় OSR সুবিধা চালু রয়েছে। মূল পরীক্ষার ৬০ দিনের মধ্যে যেকোনো একটি মডিউলে (যেমন Writing বা Reading) আশানুরূপ স্কোর না পেলে পুরো পরীক্ষা না দিয়ে শুধু সেই মডিউলটি পুনরায় দেওয়া যায়।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <strong className="text-slate-900 font-bold block">
                  প্রশ্ন ২: পাসপোর্ট না থাকলে কি এনআইডি (NID) দিয়ে রেজিস্ট্রেশন করা যাবে?
                </strong>
                <p className="text-slate-600 leading-relaxed">
                  <strong>উত্তর:</strong> না। আন্তর্জাতিক পরীক্ষার সুরক্ষার স্বার্থে ব্রিটিশ কাউন্সিল ও আইডিপি বাংলাদেশে রেজিস্ট্রেশন এবং টেস্ট-ডে এন্ট্রি—উভয় ক্ষেত্রেই মূল বৈধ পাসপোর্ট (Original Valid Passport) থাকা শতভাগ বাধ্যতামূলক।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <strong className="text-slate-900 font-bold block">
                  প্রশ্ন ৩: স্পিকিং পরীক্ষা কি লিসেনিং, রিডিং ও রাইটিংয়ের একই দিনে হয়?
                </strong>
                <p className="text-slate-600 leading-relaxed">
                  <strong>উত্তর:</strong> কম্পিউটার-বেসড টেস্টে সাধারণত একই দিনে (সকালে LRW এবং বিকেলে Speaking, অথবা আগে Speaking) অনুষ্ঠিত হয়। তবে পেপার টেস্টের ক্ষেত্রে স্পিকিং পরীক্ষা মূল পরীক্ষার সর্বোচ্চ ৭ দিন আগে বা পরে হতে পারে।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <strong className="text-slate-900 font-bold block">
                  প্রশ্ন ৪: ব্রিটিশ নাকি আমেরিকান স্পেলিং—কোনটি ব্যবহার করব?
                </strong>
                <p className="text-slate-600 leading-relaxed">
                  <strong>উত্তর:</strong> উভয় স্পেলিংই গ্রহণযোগ্য (যেমন <em>colour</em> অথবা <em>color</em>)। তবে শর্ত হলো, পুরো লেখায় যেকোনো একটি স্টাইল ধারাবাহিকভাবে বজায় রাখতে হবে।
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
