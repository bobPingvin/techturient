import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Applicant, Campaign } from '../types';
import { SPECIALTY_LIST, formatSpecialtyDisplay, getSpecialtyByFullName } from '../lib/specialties';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Search, 
  Award, 
  Calendar, 
  CheckCircle2, 
  FileCheck2, 
  Copy, 
  Share2, 
  Users, 
  Clock, 
  Info, 
  Sparkles, 
  Building2, 
  Phone, 
  MapPin, 
  ChevronRight,
  BarChart2,
  PieChart as PieChartIcon
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { displayRussianDate } from '../lib/validation';
import { toast } from '../utils/toast';

const COLORS = ['#9f1239', '#1e40af', '#047857', '#7c3aed', '#b45309', '#0d9488', '#be123c', '#4338ca'];

export function PublicRatingView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [searchCode, setSearchCode] = useState<string>(initialCode);
  const [activeTab, setActiveTab] = useState<'general' | 'benefit' | 'recommended'>('general');

  useEffect(() => {
    // Load campaigns
    const campaignsCol = collection(db, 'campaigns');
    const unsubCampaigns = onSnapshot(campaignsCol, (snap) => {
      const camps = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Campaign[];
      setCampaigns(camps);
    }, err => console.error(err));

    // Load applicants in real-time
    const applicantsCol = collection(db, 'applicants');
    const unsubApplicants = onSnapshot(applicantsCol, (snap) => {
      const data = snap.docs.map(d => {
        const item = d.data() as Applicant;
        // Ensure every applicant has a clean applicantCode
        const code = item.applicantCode || item.applicationNumber || `REG-2026-${String(item.createdAt || 0).slice(-4) || '0001'}`;
        return {
          id: d.id,
          ...item,
          applicantCode: code
        };
      }) as Applicant[];

      setApplicants(data);
      setLoading(false);
    }, err => {
      console.error('Error fetching applicants for rating:', err);
      setLoading(false);
    });

    return () => {
      unsubCampaigns();
      unsubApplicants();
    };
  }, []);

  // Update search query param if user types in search box
  const handleSearchChange = (val: string) => {
    setSearchCode(val);
    if (val.trim()) {
      setSearchParams({ code: val.trim() });
    } else {
      setSearchParams({});
    }
  };

  // Copy rating link
  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Ссылка на сводный рейтинг скопирована в буфер обмена!');
  };

  // Filter applicants by campaign
  const campaignApplicants = useMemo(() => {
    if (selectedCampaignId === 'all') return applicants;
    return applicants.filter(a => a.campaignId === selectedCampaignId);
  }, [applicants, selectedCampaignId]);

  // Unique list of specialties represented in the database
  const availableSpecialties = useMemo(() => {
    const setSpecs = new Set<string>();
    SPECIALTY_LIST.forEach(s => setSpecs.add(s.fullName));
    campaignApplicants.forEach(a => {
      if (a.specialty) setSpecs.add(a.specialty);
    });
    return Array.from(setSpecs);
  }, [campaignApplicants]);

  // Chart data for Pie Chart: dynamic based on selected specialty
  const pieChartData = useMemo(() => {
    if (selectedSpecialty === 'all') {
      // Distribution by specialty across all applicants
      const counts: Record<string, { fullName: string; shortName: string; count: number }> = {};
      campaignApplicants.forEach(a => {
        const fullLabel = formatSpecialtyDisplay(a.specialty, a.specialtyName);
        const specObj = getSpecialtyByFullName(a.specialty);
        const code = specObj?.code || '';

        let shortName = fullLabel;
        if (code === '13.02.07') shortName = '13.02.07 Электроснабжение';
        else if (code === '13.02.13') shortName = '13.02.13 Эл. оборудование';
        else if (code === '09.02.11') shortName = '09.02.11 Разработка ПО';
        else if (code === '23.02.04') shortName = '23.02.04 Техн. экспл. машин';
        else if (code === '13.01.10') shortName = '13.01.10 Электромонтер';
        else if (fullLabel.length > 25) {
          shortName = fullLabel.slice(0, 22) + '...';
        }

        if (!counts[fullLabel]) {
          counts[fullLabel] = { fullName: fullLabel, shortName, count: 0 };
        }
        counts[fullLabel].count += 1;
      });

      return Object.values(counts).map(item => ({
        name: item.shortName,
        fullName: item.fullName,
        value: item.count
      }));
    } else {
      // Distribution by document type for the selected specialty
      const specObj = getSpecialtyByFullName(selectedSpecialty);
      const filtered = campaignApplicants.filter(a => {
        if (!a.specialty) return false;
        if (a.specialty === selectedSpecialty) return true;
        if (specObj && a.specialty.includes(specObj.name)) return true;
        return false;
      });

      let originals = 0;
      let copies = 0;
      filtered.forEach(a => {
        if (a.educationDocumentSubmissionType === 'original' || !a.educationDocumentSubmissionType) {
          originals++;
        } else {
          copies++;
        }
      });

      return [
        { name: 'Оригиналы аттестатов', fullName: 'Оригиналы аттестатов', value: originals },
        { name: 'Копии документов', fullName: 'Копии документов', value: copies }
      ].filter(item => item.value > 0);
    }
  }, [campaignApplicants, selectedSpecialty]);

  // Helper sorting function for applicants
  const sortApplicantList = (list: Applicant[]) => {
    const getPrioRank = (a: Applicant) => {
      if (!a.hasBenefit && (!a.benefit || a.benefit === 'Нет льгот')) return 0;
      const effect = a.benefitEffect || '';
      if (effect.includes('Первоочередное') || effect.includes('Вне конкурса') || effect.includes('Целевое')) return 3;
      if (effect.includes('Преимущественное') || effect.includes('Дополнительные')) return 2;
      return a.hasBenefit ? 3 : 0;
    };

    return [...list].sort((a, b) => {
      const prioA = getPrioRank(a);
      const prioB = getPrioRank(b);
      if (prioB !== prioA) return prioB - prioA;

      const scoreA = a.averageScore || 0;
      const scoreB = b.averageScore || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      
      const fivesA = a.grades?.fives || 0;
      const fivesB = b.grades?.fives || 0;
      if (fivesB !== fivesA) return fivesB - fivesA;

      const foursA = a.grades?.fours || 0;
      const foursB = b.grades?.fours || 0;
      return foursB - foursA;
    });
  };

  // Map calculating exact rank among ORIGINALS for each applicant per specialty
  const originalsRankMap = useMemo(() => {
    const map = new Map<string, { rank: number; totalOriginals: number }>();

    // Group all applicants by specialty
    const specGroups: Record<string, Applicant[]> = {};
    campaignApplicants.forEach(a => {
      const specKey = a.specialty || 'Other';
      if (!specGroups[specKey]) specGroups[specKey] = [];
      specGroups[specKey].push(a);
    });

    Object.keys(specGroups).forEach(specKey => {
      const specApplicants = specGroups[specKey];
      // Filter only originals and sort them
      const originalsOnly = sortApplicantList(
        specApplicants.filter(a => a.educationDocumentSubmissionType === 'original' || !a.educationDocumentSubmissionType)
      );

      originalsOnly.forEach((app, idx) => {
        map.set(app.id, { rank: idx + 1, totalOriginals: originalsOnly.length });
      });
    });

    return map;
  }, [campaignApplicants]);

  // Filtered and sorted list for selected specialty & tab
  const tabApplicants = useMemo(() => {
    let list = [...campaignApplicants];

    // Filter by selected specialty
    if (selectedSpecialty !== 'all') {
      const specObj = getSpecialtyByFullName(selectedSpecialty);
      list = list.filter(a => {
        if (!a.specialty) return false;
        if (a.specialty === selectedSpecialty) return true;
        if (specObj && a.specialty.includes(specObj.name)) return true;
        return false;
      });
    }

    // Filter by tab type
    if (activeTab === 'benefit') {
      // Квоты и целевое обучение
      list = list.filter(a => a.hasBenefit || a.fundingType === 'Платно/Целевое' || a.benefitEffect === 'Целевое обучение');
    } else if (activeTab === 'recommended') {
      // Только подавшие ОРИГИНАЛ аттестата
      list = list.filter(a => a.educationDocumentSubmissionType === 'original' || !a.educationDocumentSubmissionType);
    }

    return sortApplicantList(list);
  }, [campaignApplicants, selectedSpecialty, activeTab]);

  // Find target applicant if code search is active
  const foundApplicant = useMemo(() => {
    if (!searchCode.trim()) return null;
    const q = searchCode.toLowerCase().trim();
    return applicants.find(a => 
      (a.applicantCode && a.applicantCode.toLowerCase() === q) ||
      (a.applicationNumber && a.applicationNumber.toLowerCase() === q) ||
      (a.applicantCode && a.applicantCode.toLowerCase().includes(q))
    );
  }, [applicants, searchCode]);

  // Find rank position of found applicant in currently filtered list
  const foundRank = useMemo(() => {
    if (!foundApplicant) return 0;
    const idx = tabApplicants.findIndex(a => a.id === foundApplicant.id);
    return idx >= 0 ? idx + 1 : 0;
  }, [foundApplicant, tabApplicants]);

  // Capacity calculation for recommended list
  const currentCapacity = useMemo(() => {
    if (selectedSpecialty === 'all') return 50;
    const spec = getSpecialtyByFullName(selectedSpecialty);
    return spec?.capacity || 25;
  }, [selectedSpecialty]);

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-sans">
      
      {/* Top Banner Header */}
      <header className="bg-gradient-to-r from-rose-950 via-rose-900 to-rose-800 text-white border-b border-rose-900 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                <GraduationCap className="text-white w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-rose-200">
                    ГБПОУ НСО «Новосибирский электромеханический колледж»
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                    Приём 2026
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
                  Публичный рейтинг поступающих
                </h1>
                <p className="text-xs text-rose-200 mt-0.5">
                  Сводная таблица распределения абитуриентов по среднему баллу аттестата и подаче оригиналов
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white rounded-xl text-xs font-bold transition-all border border-white/20 cursor-pointer shadow-sm"
              >
                <Share2 className="w-4 h-4 text-rose-300" />
                <span>Поделиться ссылкой</span>
              </button>
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-rose-950 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <span>Вход для сотрудников</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Campaign Dates & Official Info Header Bar */}
          <div className="mt-6 pt-4 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white/10 p-3 rounded-xl border border-white/10 flex items-center gap-3">
              <Calendar className="w-5 h-5 text-rose-300 shrink-0" />
              <div>
                <div className="text-[11px] text-rose-200 font-semibold uppercase">Начало работы приёмной комиссии</div>
                <div className="font-bold text-white">20 июня 2026 г.</div>
              </div>
            </div>

            <div className="bg-white/10 p-3 rounded-xl border border-white/10 flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-300 shrink-0" />
              <div>
                <div className="text-[11px] text-rose-200 font-semibold uppercase">Окончание приёма документов</div>
                <div className="font-bold text-amber-200">15 августа 2026 г. (15:00)</div>
              </div>
            </div>

            <div className="bg-white/10 p-3 rounded-xl border border-white/10 flex items-center gap-3">
              <Users className="w-5 h-5 text-emerald-300 shrink-0" />
              <div>
                <div className="text-[11px] text-rose-200 font-semibold uppercase">Подано заявлений в базе</div>
                <div className="font-bold text-white">{campaignApplicants.length} абитуриентов</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1 w-full">
        
        {/* Visual Chart & Summary Cards Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Pie Chart Card */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-3 border-b border-stone-100 pb-2.5">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-rose-800" />
                <span>
                  {selectedSpecialty === 'all' 
                    ? 'Распределение по специальностям' 
                    : `Документы (${getSpecialtyByFullName(selectedSpecialty)?.code || 'Специальность'})`}
                </span>
              </h3>
              <span className="text-[11px] font-bold text-rose-900 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                Всего: {pieChartData.reduce((acc, curr) => acc + curr.value, 0)}
              </span>
            </div>

            <div className="w-full">
              {pieChartData.length > 0 ? (
                <>
                  <div className="h-44 sm:h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={36}
                          outerRadius={64}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(val: number, _name: string, item: any) => [
                            `${val} чел.`, 
                            item?.payload?.fullName || item?.payload?.name || 'Количество'
                          ]}
                          contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e7e5e4', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', zIndex: 50 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Custom Legend Chips */}
                  <div className="mt-2 flex flex-wrap justify-center gap-1.5 max-h-28 overflow-y-auto pr-1">
                    {pieChartData.map((item, idx) => (
                      <div 
                        key={idx} 
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-50 hover:bg-stone-100 rounded-md border border-stone-200 text-[11px] font-semibold text-stone-700 transition-colors shadow-2xs"
                        title={item.fullName || item.name}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="truncate max-w-[130px] sm:max-w-[160px]">{item.name}</span>
                        <span className="ml-0.5 text-stone-900 font-bold bg-white px-1.5 py-0.2 rounded border border-stone-200 text-[10px]">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-48 text-stone-400 text-xs">
                  Нет данных для диаграммы
                </div>
              )}
            </div>

            <div className="mt-3 text-[11px] text-stone-400 text-center">
              * Нажмите или наведите на сегмент для подробностей
            </div>
          </div>

          {/* Individual Code Search & Position Checker */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Search className="w-4 h-4 text-rose-800" />
                  <span>Поиск своего места в рейтинге</span>
                </h3>
                <span className="text-xs text-stone-500">По индивидуальному коду или номеру</span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={searchCode}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Введите ваш код (например: REG-2026-0042 или 0042)..."
                  className="w-full pl-11 pr-24 py-3 border-2 border-stone-300 focus:border-rose-800 rounded-xl font-mono text-sm text-stone-900 bg-stone-50/50 focus:bg-white transition-all outline-none"
                />
                <Search className="w-5 h-5 text-stone-400 absolute left-3.5 top-3.5" />
                {searchCode && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="absolute right-3 top-3 text-xs bg-stone-200 hover:bg-stone-300 text-stone-700 px-2.5 py-1 rounded-lg font-bold cursor-pointer"
                  >
                    Сбросить
                  </button>
                )}
              </div>

              {/* Display Result Card if Code is Found */}
              {foundApplicant ? (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-300 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                        Найден поступающий:
                      </span>
                      <span className="font-mono font-bold text-sm bg-emerald-800 text-white px-2.5 py-0.5 rounded-lg">
                        {foundApplicant.applicantCode || foundApplicant.applicationNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {foundRank > 0 && (
                        <span className="text-xs font-black text-white bg-rose-900 px-2.5 py-0.5 rounded-md shadow-2xs">
                          Общий рейтинг: № {foundRank}
                        </span>
                      )}
                      {foundApplicant.educationDocumentSubmissionType === 'copy' ? (
                        <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-md border border-amber-300">
                          По оригиналам: Копия
                        </span>
                      ) : (
                        <span className="text-xs font-black text-emerald-950 bg-emerald-200 px-2.5 py-0.5 rounded-md border border-emerald-400">
                          Место по оригиналам: № {originalsRankMap.get(foundApplicant.id)?.rank || 1} из {originalsRankMap.get(foundApplicant.id)?.totalOriginals || 1}
                        </span>
                      )}
                      <span className="text-xs font-extrabold text-emerald-900 bg-emerald-200/80 px-2.5 py-0.5 rounded-md">
                        Средний балл: {(foundApplicant.averageScore || 0).toFixed(3)}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-stone-800 space-y-1">
                    <div>
                      <strong>Специальность:</strong> {formatSpecialtyDisplay(foundApplicant.specialty, foundApplicant.specialtyName)}
                    </div>
                    <div>
                      <strong>Документ об образовании:</strong> {foundApplicant.educationDocumentSubmissionType === 'copy' ? 'Копия' : 'ОРИГИНАЛ (Зачисление)'}
                    </div>
                    {foundApplicant.hasBenefit && (
                      <div className="text-amber-950 font-bold bg-amber-100/80 p-2 rounded-lg border border-amber-200 flex items-center gap-1.5 mt-1">
                        <Award className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>Первоочередное зачисление / Квота: {foundApplicant.benefit} ({foundApplicant.benefitEffect || 'Первоочередное право'})</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : searchCode.trim() ? (
                <div className="p-3.5 bg-rose-50 text-rose-900 rounded-xl border border-rose-200 text-xs flex items-center gap-2">
                  <Info className="w-4 h-4 text-rose-700 shrink-0" />
                  <span>Поступающий с кодом «{searchCode}» не найден в базе активных заявлений. Проверьте правильность кода.</span>
                </div>
              ) : (
                <p className="text-xs text-stone-500 leading-relaxed">
                  Каждому поступающему при подаче документов присваивается индивидуальный регистрационный номер (например, <code className="font-mono bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200 font-bold">REG-2026-0042</code>). Введите его выше, чтобы узнать точный балл и текущую позицию в рейтинге.
                </p>
              )}
            </div>

            {/* Contacts Footer in Card */}
            <div className="pt-3 border-t border-stone-100 mt-4 flex flex-wrap items-center justify-between text-[11px] text-stone-500 gap-2">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-800" />
                г. Новосибирск, ул. Первомайская, д. 202, каб. 110
              </span>
              <span className="flex items-center gap-1 font-bold text-stone-700">
                <Phone className="w-3.5 h-3.5 text-rose-800" />
                +7 (383) 269-34-10
              </span>
            </div>
          </div>

        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-stone-100 pb-4">
            
            {/* Specialty Selector Dropdown */}
            <div className="w-full md:w-1/2 space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                Фильтр по специальности / профессии:
              </label>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white text-sm font-semibold cursor-pointer"
              >
                <option value="all">★ Все специальности и направления (Сводный рейтинг)</option>
                {SPECIALTY_LIST.map(spec => (
                  <option key={spec.id} value={spec.fullName}>
                    {spec.code ? `${spec.code} ` : ''}{spec.name} ({spec.funding} — мест: {spec.capacity})
                  </option>
                ))}
              </select>
            </div>

            {/* Campaign Selector if multiple exist */}
            {campaigns.length > 1 && (
              <div className="w-full md:w-1/3 space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                  Приёмная кампания:
                </label>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-800 text-stone-900 bg-white text-sm cursor-pointer"
                >
                  <option value="all">Все кампании</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

          </div>

          {/* 3 Distinct List Type Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            
            {/* Tab 1: General */}
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'general'
                  ? 'bg-rose-900 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>1. Основной конкурс (По среднему баллу)</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'general' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-800'}`}>
                {activeTab === 'general' ? tabApplicants.length : 'Все'}
              </span>
            </button>

            {/* Tab 2: Benefits & Target */}
            <button
              type="button"
              onClick={() => setActiveTab('benefit')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'benefit'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>2. Целевой приём и льготные категории (Квоты)</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'benefit' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-800'}`}>
                {activeTab === 'benefit' ? tabApplicants.length : 'Квоты'}
              </span>
            </button>

            {/* Tab 3: Recommended (Originals) */}
            <button
              type="button"
              onClick={() => setActiveTab('recommended')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'recommended'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>3. Рекомендованы к зачислению (По оригиналам)</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'recommended' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-800'}`}>
                {activeTab === 'recommended' ? tabApplicants.length : 'Оригиналы'}
              </span>
            </button>

          </div>

        </div>

        {/* Rating Table Section */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          
          <div className="p-4 bg-stone-50/80 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-stone-900">
                {activeTab === 'general' && 'Сводный ранжированный список поступающих'}
                {activeTab === 'benefit' && 'Список поступающих по целевой квоте и льготным категориям'}
                {activeTab === 'recommended' && 'Рейтинг поступающих, предоставивших ОРИГИНАЛ документа об образовании'}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Ранжирование выполнено строго по убыванию среднего балла аттестата
              </p>
            </div>

            <div className="text-xs font-semibold text-stone-700 bg-white px-3 py-1.5 rounded-lg border border-stone-200">
              Показано абитуриентов: <span className="font-bold text-rose-900">{tabApplicants.length}</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {tabApplicants.length === 0 ? (
              <div className="py-16 text-center px-4 text-stone-500 space-y-2">
                <Info className="w-8 h-8 text-stone-300 mx-auto" />
                <p className="text-sm font-medium">По заданным критериям в списке пока нет поступающих.</p>
                <p className="text-xs text-stone-400">Попробуйте выбрать другую специальность или вкладку списков.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-stone-200 text-sm">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="px-4 py-3.5 text-left text-xs font-bold text-stone-700 uppercase tracking-wider">№ п/п</th>
                    <th className="px-4 py-3.5 text-left text-xs font-bold text-stone-700 uppercase tracking-wider">Индивидуальный код</th>
                    <th className="px-4 py-3.5 text-left text-xs font-bold text-stone-700 uppercase tracking-wider">Специальность</th>
                    <th className="px-4 py-3.5 text-left text-xs font-bold text-stone-700 uppercase tracking-wider text-emerald-900 bg-emerald-100/50">
                      Место по оригиналам
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-bold text-stone-700 uppercase tracking-wider">Средний балл</th>
                    <th className="px-4 py-3.5 text-left text-xs font-bold text-stone-700 uppercase tracking-wider">Оценки (5/4/3)</th>
                    <th className="px-4 py-3.5 text-left text-xs font-bold text-stone-700 uppercase tracking-wider">Документ</th>
                    <th className="px-4 py-3.5 text-left text-xs font-bold text-stone-700 uppercase tracking-wider">Статус / Рекомендация</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-stone-100 bg-white">
                  {tabApplicants.map((item, index) => {
                    const rank = index + 1;
                    const isFound = foundApplicant?.id === item.id;
                    const isOriginal = item.educationDocumentSubmissionType === 'original' || !item.educationDocumentSubmissionType;
                    const isWithinCapacity = rank <= currentCapacity;
                    const origInfo = originalsRankMap.get(item.id);

                    return (
                      <tr 
                        key={item.id} 
                        className={`transition-colors ${
                          isFound 
                            ? 'bg-emerald-100/90 font-semibold ring-2 ring-emerald-500' 
                            : item.hasBenefit
                            ? 'bg-amber-50/60 hover:bg-amber-100/60'
                            : isWithinCapacity && activeTab === 'recommended'
                            ? 'bg-emerald-50/40 hover:bg-emerald-50'
                            : 'hover:bg-stone-50'
                        }`}
                      >
                        {/* Rank */}
                        <td className="px-4 py-3.5 font-mono font-bold text-stone-900 whitespace-nowrap">
                          {rank <= 3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-900 text-white text-xs font-bold shadow-2xs">
                              {rank}
                            </span>
                          ) : (
                            <span className="text-stone-600">#{rank}</span>
                          )}
                        </td>

                        {/* Individual Code */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-mono font-bold text-stone-900 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200 inline-flex items-center gap-1.5">
                            {item.applicantCode || item.applicationNumber}
                            {item.hasBenefit && (
                              <span className="bg-amber-200 text-amber-950 text-[10px] font-black px-1.5 py-0.2 rounded border border-amber-300" title="Первоочередное зачисление по льготе">
                                КВОТА
                              </span>
                            )}
                          </span>
                        </td>

                        {/* Specialty */}
                        <td className="px-4 py-3.5">
                          <div className="text-xs font-bold text-stone-900">
                            {formatSpecialtyDisplay(item.specialty, item.specialtyName)}
                          </div>
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border mt-0.5 inline-block ${
                            item.fundingType === 'Бюджет' || item.specialty?.includes('Бюджет')
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-blue-100 text-blue-900 border-blue-300'
                          }`}>
                            {item.fundingType || (item.specialty?.includes('Бюджет') ? 'Бюджет' : 'Платно')}
                          </span>
                        </td>

                        {/* Position among Originals */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                          {isOriginal ? (
                            <span className="inline-flex items-center gap-1 font-extrabold text-emerald-950 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300">
                              № {origInfo?.rank || 1} <span className="text-[10px] text-emerald-800 font-normal">из {origInfo?.totalOriginals || 1}</span>
                            </span>
                          ) : (
                            <span className="text-stone-400 text-xs font-medium">
                              — (Копия)
                            </span>
                          )}
                        </td>

                        {/* Average score */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-black bg-rose-50 text-rose-900 border border-rose-200">
                            {(item.averageScore || 0).toFixed(3)}
                          </span>
                        </td>

                        {/* Grades */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                          <div className="flex items-center gap-1 font-mono">
                            <span className="text-rose-900 bg-rose-50 px-1.5 py-0.5 rounded font-bold">5: {item.grades?.fives ?? 0}</span>
                            <span className="text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded">4: {item.grades?.fours ?? 0}</span>
                            <span className="text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded">3: {item.grades?.threes ?? 0}</span>
                          </div>
                        </td>

                        {/* Education Doc Original / Copy */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                          {isOriginal ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              <FileCheck2 className="w-3.5 h-3.5 text-emerald-700" />
                              Оригинал
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <Copy className="w-3.5 h-3.5 text-amber-700" />
                              Копия
                            </span>
                          )}
                        </td>

                        {/* Recommendation status */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                          {activeTab === 'recommended' ? (
                            isWithinCapacity ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-black text-xs bg-emerald-700 text-white shadow-2xs">
                                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                                Рекомендован к зачислению
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                                В резерве (Оригинал)
                              </span>
                            )
                          ) : item.hasBenefit ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold bg-purple-100 text-purple-950 border border-purple-300">
                              <Award className="w-3.5 h-3.5 text-purple-700" />
                              {item.benefitEffect || item.benefit || 'Преимущественное право'}
                            </span>
                          ) : isOriginal ? (
                            <span className="text-emerald-800 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              В конкурсе (Оригинал)
                            </span>
                          ) : (
                            <span className="text-stone-500 font-normal">
                              В конкурсе (Копия)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

        </div>

        {/* Footer Memo & Contact Info Box */}
        <div className="bg-stone-900 text-stone-300 p-6 rounded-2xl shadow-md border border-stone-800 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-stone-800 pb-4 gap-3">
            <div>
              <h4 className="text-white font-bold text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-rose-400" />
                <span>Приёмная комиссия ГБПОУ НСО «НЭК»</span>
              </h4>
              <p className="text-xs text-stone-400 mt-0.5">Официальная информация для абитуриентов и родителей</p>
            </div>
            
            <span className="text-xs bg-rose-950 text-rose-200 font-semibold px-3 py-1 rounded-lg border border-rose-800">
              График работы: Пн-Пт: 09:00 – 17:00, Сб: 09:00 – 13:00
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <div className="text-stone-400 font-semibold mb-1">Адрес приёмной комиссии:</div>
              <p className="text-stone-200 font-medium">630068, г. Новосибирск, ул. Первомайская, д. 202, каб. 103</p>
            </div>

            <div>
              <div className="text-stone-400 font-semibold mb-1">Контактные телефоны:</div>
              <p className="text-stone-200 font-medium font-mono">8 (383) 337-23-27 | 8 (383) 337-25-56</p>
            </div>

            <div>
              <div className="text-stone-400 font-semibold mb-1">Электронная почта:</div>
              <p className="text-rose-300 font-medium font-mono">priem_nemk.2020@mail.ru</p>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-4 text-center text-xs text-stone-500">
        © 2026 ГБПОУ НСО «Новосибирский электромеханический колледж» • Публичный модуль рейтинга поступающих
      </footer>

    </div>
  );
}
