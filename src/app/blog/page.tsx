'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { Search, Calendar, Clock, User, ChevronRight, TrendingUp, Sparkles, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const blogCategories = [
  { id: 'all', name: 'الكل' },
  { id: 'programming', name: 'البرمجة والتطوير' },
  { id: 'ai', name: 'الذكاء الاصطناعي' },
  { id: 'business', name: 'ريادة الأعمال' },
  { id: 'tips', name: 'نصائح للطلاب' },
  { id: 'news', name: 'أخبار الأكاديمية' },
];

const featuredPost = {
  id: 'featured-1',
  title: 'كيف سيعيد الذكاء الاصطناعي تشكيل مستقبل الوظائف التقنية في 2026؟',
  excerpt: 'في هذا المقال نستعرض كيف أثرت أدوات مثل ChatGPT و Github Copilot على سوق العمل البرمجي، وكيف يمكن للمطورين التكيف مع هذه التغييرات لضمان بقائهم في الطليعة.',
  category: 'الذكاء الاصطناعي',
  date: '20 سبتمبر 2026',
  readTime: '8 دقائق قراءة',
  author: 'أحمد خليل',
  authorRole: 'خبير ذكاء اصطناعي',
  authorAvatar: 'https://i.pravatar.cc/150?img=11',
  image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=1600&h=800',
  slug: 'ai-future-jobs-2026'
};

const blogPosts = [
  {
    id: 1,
    title: 'خارطة الطريق لتعلم تطوير الواجهات الأمامية (Front-end) من الصفر',
    excerpt: 'دليلك الشامل لتعلم HTML, CSS, JavaScript والبدء مع إطار عمل React بخطوات عملية ومشاريع تطبيقية.',
    category: 'البرمجة والتطوير',
    date: '15 سبتمبر 2026',
    readTime: '6 دقائق قراءة',
    author: 'سارة محمد',
    image: 'https://images.unsplash.com/photo-1555099962-4199c345e5dd?auto=format&fit=crop&q=80&w=800&h=500',
    slug: 'frontend-roadmap'
  },
  {
    id: 2,
    title: 'أفضل 5 طرق لزيادة إنتاجيتك أثناء الدراسة عبر الإنترنت',
    excerpt: 'التعلم عن بعد يتطلب انضباطاً، إليك أفضل التقنيات (مثل البومودورو) للبقاء مركزاً وتجنب التشتت.',
    category: 'نصائح للطلاب',
    date: '12 سبتمبر 2026',
    readTime: '4 دقائق قراءة',
    author: 'د. يوسف أحمد',
    image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=800&h=500',
    slug: 'productivity-online-learning'
  },
  {
    id: 3,
    title: 'إطلاق ميزة "محاكي الامتحانات" الجديدة في KQ Academy',
    excerpt: 'نحن فخورون بالإعلان عن أداتنا الجديدة التي ستساعد طلاب الشهادات على التحضير الفعلي للامتحانات النهائية بأجواء واقعية.',
    category: 'أخبار الأكاديمية',
    date: '10 سبتمبر 2026',
    readTime: '3 دقائق قراءة',
    author: 'فريق الإدارة',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800&h=500',
    slug: 'new-exam-simulator'
  },
  {
    id: 4,
    title: 'لماذا يجب على كل رائد أعمال تعلم أساسيات تحليل البيانات؟',
    excerpt: 'البيانات هي نفط العصر الجديد. كيف تستخدم تحليل البيانات البسيط لاتخاذ قرارات تجارية أفضل لمشروعك الناشئ.',
    category: 'ريادة الأعمال',
    date: '05 سبتمبر 2026',
    readTime: '7 دقائق قراءة',
    author: 'ليلى عمر',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800&h=500',
    slug: 'data-for-entrepreneurs'
  },
  {
    id: 5,
    title: 'كيف تبني تطبيق موبايل باستخدام React Native و Firebase؟',
    excerpt: 'في هذا الدرس السريع، سنقوم ببناء تطبيق محادثة حقيقي يعمل على نظامي Android و iOS باستخدام تقنيات حديثة ومجانية.',
    category: 'البرمجة والتطوير',
    date: '01 سبتمبر 2026',
    readTime: '12 دقيقة قراءة',
    author: 'كريم حسين',
    image: 'https://images.unsplash.com/photo-1526045612212-70cb359b22fe?auto=format&fit=crop&q=80&w=800&h=500',
    slug: 'react-native-firebase-chat'
  },
  {
    id: 6,
    title: 'مقدمة في هندسة الأوامر (Prompt Engineering) لـ ChatGPT',
    excerpt: 'تعلم كيف تصيغ أوامرك بدقة للحصول على أفضل النتائج الممكنة من نماذج اللغة الذكية ووفر ساعات من العمل.',
    category: 'الذكاء الاصطناعي',
    date: '28 أغسطس 2026',
    readTime: '5 دقائق قراءة',
    author: 'أحمد خليل',
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=800&h=500',
    slug: 'intro-to-prompt-engineering'
  }
];

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPosts = blogPosts.filter(post => {
    const matchesCategory = activeCategory === 'all' || post.category === blogCategories.find(c => c.id === activeCategory)?.name;
    const matchesSearch = post.title.includes(searchQuery) || post.excerpt.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30 font-sans" dir="rtl">
      <Navbar />

      <main className="pt-24 pb-20">
        
        {/* Page Header */}
        <section className="relative py-12 border-b border-white/5">
          <div className="container mx-auto px-6 relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-extrabold mb-4 flex items-center gap-3">
                  مدونة <span className="text-primary">KQ</span> <Sparkles className="text-yellow-400" size={32} />
                </h1>
                <p className="text-gray-400 text-lg max-w-xl">
                  مقالات تقنية، أفكار ملهمة، وآخر التحديثات في عالم البرمجة والتعليم.
                </p>
              </div>
              
              {/* Search Bar */}
              <div className="w-full md:w-96 relative group">
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <Search size={20} className="text-gray-500 group-focus-within:text-primary transition-colors" />
                </div>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث في المقالات..." 
                  className="w-full bg-[#111] border border-white/10 rounded-2xl py-4 pr-12 pl-4 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-white placeholder-gray-600"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Featured Post (Only show if no search and active category is 'all') */}
        <AnimatePresence>
          {activeCategory === 'all' && !searchQuery && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="py-12"
            >
              <div className="container mx-auto px-6">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="text-primary" size={24} />
                  <h2 className="text-2xl font-bold">مقالة مميزة</h2>
                </div>
                
                <Link href={`/blog/${featuredPost.slug}`} className="group relative block w-full rounded-3xl overflow-hidden border border-white/10 hover:border-primary/40 transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent z-10" />
                  <img 
                    src={featuredPost.image} 
                    alt={featuredPost.title} 
                    className="w-full h-[500px] object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  
                  <div className="absolute inset-0 z-20 flex flex-col justify-end p-8 md:p-12">
                    <span className="inline-block px-4 py-1.5 bg-primary text-black font-bold text-sm rounded-full mb-6 w-fit">
                      {featuredPost.category}
                    </span>
                    
                    <h3 className="text-3xl md:text-5xl font-bold mb-4 leading-tight group-hover:text-primary transition-colors">
                      {featuredPost.title}
                    </h3>
                    
                    <p className="text-gray-300 text-lg md:text-xl mb-8 max-w-4xl line-clamp-2">
                      {featuredPost.excerpt}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400">
                      <div className="flex items-center gap-3">
                        <img src={featuredPost.authorAvatar} alt={featuredPost.author} className="w-10 h-10 rounded-full border border-white/20" />
                        <div>
                          <p className="text-white font-bold">{featuredPost.author}</p>
                          <p className="text-xs">{featuredPost.authorRole}</p>
                        </div>
                      </div>
                      <div className="hidden sm:block w-px h-8 bg-white/20" />
                      <div className="flex items-center gap-2"><Calendar size={16} /> {featuredPost.date}</div>
                      <div className="flex items-center gap-2"><Clock size={16} /> {featuredPost.readTime}</div>
                    </div>
                  </div>
                </Link>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Categories Bar */}
        <section className="py-6 sticky top-20 z-40 bg-[#050505]/90 backdrop-blur-md border-y border-white/5">
          <div className="container mx-auto px-6">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {blogCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`shrink-0 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                    activeCategory === cat.id
                      ? 'bg-primary text-black shadow-[0_0_15px_rgba(203,161,83,0.3)]'
                      : 'bg-[#111] text-gray-400 border border-white/5 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Posts Grid */}
        <section className="py-12">
          <div className="container mx-auto px-6">
            
            {filteredPosts.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-500">
                  <Search size={40} />
                </div>
                <h3 className="text-2xl font-bold mb-2">لا توجد نتائج</h3>
                <p className="text-gray-400">لم نتمكن من العثور على مقالات تطابق بحثك. جرب كلمات مفتاحية أخرى.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <AnimatePresence>
                  {filteredPosts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Link href={`/blog/${post.slug}`} className="group flex flex-col h-full bg-[#0a0a0a] rounded-3xl overflow-hidden border border-white/5 hover:border-primary/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_15px_40px_rgba(0,0,0,0.5)]">
                        {/* Image Container */}
                        <div className="relative h-60 overflow-hidden">
                          <img 
                            src={post.image} 
                            alt={post.title} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                          <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-xs font-bold text-white">
                            {post.category}
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className="p-6 flex flex-col flex-1">
                          <h3 className="text-xl font-bold mb-3 leading-snug group-hover:text-primary transition-colors line-clamp-2">
                            {post.title}
                          </h3>
                          <p className="text-gray-400 text-sm mb-6 leading-relaxed line-clamp-3 flex-1">
                            {post.excerpt}
                          </p>
                          
                          {/* Meta footer */}
                          <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <User size={14} />
                              <span>{post.author}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1"><Calendar size={14} /> {post.date.split(' ')[0]} {post.date.split(' ')[1]}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
            
            {filteredPosts.length > 0 && (
              <div className="mt-16 text-center">
                <button className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold transition-all text-white flex items-center gap-2 mx-auto group">
                  تحميل المزيد <ArrowLeft size={18} className="transform group-hover:-translate-x-1 transition-transform" />
                </button>
              </div>
            )}

          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
