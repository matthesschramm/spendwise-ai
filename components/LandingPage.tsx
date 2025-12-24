import React from 'react';

interface LandingPageProps {
    onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
    return (
        <div className="min-h-screen bg-slate-50 overflow-x-hidden">
            {/* Navigation Pre-Header */}
            <nav className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between relative z-20">
                <div className="flex items-center gap-2">
                    <img src="/logo.jpg" alt="SpendWise Logo" className="h-10 w-auto object-contain rounded-lg" />
                    <span className="text-xl font-black text-slate-900 tracking-tighter uppercase">SpendWise AI</span>
                </div>
                <button
                    onClick={onGetStarted}
                    className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                    Sign In
                </button>
            </nav>

            {/* Hero Section */}
            <section className="max-w-7xl mx-auto px-6 pt-12 pb-24 relative">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div className="relative z-10 animate-in fade-in slide-in-from-left duration-700">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 mb-6 font-bold text-xs text-blue-600 uppercase tracking-widest">
                            <i className="fa-solid fa-sparkles"></i>
                            Powered by Gemini 1.5 Pro
                        </div>
                        <h1 className="text-6xl lg:text-7xl font-extrabold text-slate-900 leading-[1.1] mb-8 tracking-tight">
                            Master your money with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">financial AI.</span>
                        </h1>
                        <p className="text-xl text-slate-600 leading-relaxed mb-10 max-w-xl">
                            Stop manual tracking. SpendWise AI automatically categorizes your bank statements, provides deep insights, and helps you optimize your financial life in seconds.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={onGetStarted}
                                className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 lg:w-max"
                            >
                                Get Started Free
                                <i className="fa-solid fa-arrow-right"></i>
                            </button>
                            <div className="flex -space-x-2 items-center px-4 self-center lg:self-auto mt-4 sm:mt-0">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-slate-50 overflow-hidden">
                                        <img src={`https://i.pravatar.cc/100?u=${i}`} alt="User" />
                                    </div>
                                ))}
                                <span className="pl-4 text-sm text-slate-500 font-medium">Joined by 1,000+ users</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative animate-in fade-in slide-in-from-right duration-1000">
                        {/* Decorative Background Glow */}
                        <div className="absolute -inset-4 bg-gradient-to-tr from-blue-500 to-emerald-400 rounded-[3rem] blur-2xl opacity-10"></div>
                        <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white">
                            <img
                                src="/hero.png"
                                alt=" SpendWise AI Dashboard"
                                className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-700"
                            />
                        </div>

                        {/* Floating Status UI */}
                        <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl shadow-slate-200 border border-slate-100 animate-bounce duration-[3000ms]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                                    <i className="fa-solid fa-check text-emerald-600"></i>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Classification Complete</p>
                                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">98% Accuracy</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="bg-white py-24 border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Smarter tracking, zero effort.</h2>
                        <p className="text-slate-600 max-w-2xl mx-auto">SpendWise AI is built to give you the clarity you need to make better financial decisions, without the spreadsheet headache.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: 'brain',
                                title: 'Gemini Classification',
                                desc: 'Our AI reads your bank statements and automatically sorts your spending into meaningful categories.',
                                color: 'blue'
                            },
                            {
                                icon: 'chart-line',
                                title: 'Visual Trends',
                                desc: 'See your money move with beautiful, interactive charts that highlight your spending habits.',
                                color: 'emerald'
                            },
                            {
                                icon: 'calendar-days',
                                title: 'Statement Periods',
                                desc: 'View your data by calendar month or mid-month statement cycles for perfect alignment.',
                                color: 'amber'
                            }
                        ].map((feature, idx) => (
                            <div key={idx} className="p-8 rounded-3xl border border-slate-100 hover:border-slate-200 transition-all hover:shadow-xl hover:shadow-slate-100 group">
                                <div className={`w-12 h-12 rounded-2xl bg-${feature.color}-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                    <i className={`fa-solid fa-${feature.icon} text-${feature.color}-600 text-xl`}></i>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                                <p className="text-slate-600 text-sm leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 max-w-7xl mx-auto px-6">
                <div className="bg-slate-900 rounded-[3rem] p-12 lg:p-20 text-center relative overflow-hidden">
                    {/* Background Texture */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none">
                        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2"></div>
                        <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2"></div>
                    </div>

                    <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-8 relative z-10 leading-tight">
                        Ready to gain full control <br className="hidden lg:block" /> of your finances?
                    </h2>
                    <p className="text-slate-400 text-lg mb-12 max-w-2xl mx-auto relative z-10 font-medium">
                        Join hundreds of users already optimizing their spending with SpendWise AI. No credit card required to start.
                    </p>
                    <button
                        onClick={onGetStarted}
                        className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-bold text-xl hover:bg-blue-700 transition-all shadow-2xl shadow-blue-900/40 relative z-10"
                    >
                        Sign Up for Free
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 text-slate-400 font-medium text-sm">
                <div className="flex items-center gap-2 grayscale brightness-50 contrast-125">
                    <img src="/logo.jpg" alt="Logo" className="h-6 w-auto opacity-50" />
                    <span className="font-bold tracking-tight">SPENDWISE AI</span>
                </div>
                <div className="flex gap-8">
                    <a href="#" className="hover:text-slate-600">Privacy Policy</a>
                    <a href="#" className="hover:text-slate-600">Terms of Service</a>
                    <a href="#" className="hover:text-slate-600">Contact Support</a>
                </div>
                <p>© 2024 SpendWise AI. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default LandingPage;
