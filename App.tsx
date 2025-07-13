// src/App.tsx

import React, { useState, useCallback, ReactNode } from 'react';
import { Feature, SermonStyleKey, SERMON_STYLES, ScriptureResultItem } from './types';
import { LogoIcon, SermonIcon, PrayerIcon, BulletinIcon, MessageIcon, EventIcon, SearchIcon, QnAIcon } from './components/Icons';
import * as geminiService from './services/geminiService';
import QnAChat from './components/QnAChat';

// --- Helper & UI Components ---

const Spinner = ({ small = false }: { small?: boolean }) => (
    <div className={`flex justify-center items-center ${small ? '' : 'h-full'}`}>
        <div className={`animate-spin rounded-full border-t-2 border-b-2 border-sky-500 ${small ? 'h-5 w-5' : 'h-16 w-16'}`}></div>
    </div>
);

const SimpleMarkdownParser = ({ text }: { text: string }) => {
    // [개선 3] 마크다운 리스트 정규식 보완
    const html = text
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-sky-800">$1</strong>')
        .replace(/### (.*?)(\r?\n|$)/g, '<h3 class="text-xl font-bold mt-4 mb-2">$1</h3>')
        .replace(/## (.*?)(\r?\n|$)/g, '<h2 class="text-2xl font-bold mt-6 mb-3 pb-2 border-b border-slate-200">$1</h2>')
        .replace(/# (.*?)(\r?\n|$)/g, '<h1 class="text-3xl font-bold mt-8 mb-4 pb-2 border-b border-slate-300">$1</h1>')
        // ul/li 변환을 위해 임시 태그 사용
        .replace(/^( *[-*] .*)(\r?\n(?! *[-*] ))*/gm, (match) => `<ul>${match.replace(/^ *[-*] (.*)/gm, '<li>$1</li>')}</ul>`)
        .replace(/\n/g, '<br />')
        // ul>br 태그 제거
        .replace(/<\/ul><br \/>/g, '</ul>')
        .replace(/<br \/><ul>/g, '<ul>')
        // li>br 태그 제거
        .replace(/<\/li><br \/>/g, '</li>');

    // 여러 ul 태그를 하나로 합치지 않도록 기존 로직 제거
    return <div className="prose max-w-none text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
};


const ScriptureSearchResults = ({ data }: { data: ScriptureResultItem[] }) => (
    <div>
        {data.map((item, index) => (
            <div key={index} className="mb-6 p-4 border border-slate-200 rounded-lg bg-slate-50 last:mb-0">
                <blockquote className="border-l-4 border-sky-500 pl-4">
                    <p className="text-slate-700 mb-2 italic">"{item.verse}"</p>
                    <footer className="text-slate-600 font-semibold">{item.reference}</footer>
                </blockquote>
                <div className="mt-3 text-sm text-slate-600">
                    <p><strong className="font-semibold text-sky-800">요약 및 적용:</strong> {item.summary}</p>
                </div>
            </div>
        ))}
    </div>
);

interface ResultDisplayProps {
    content: string;
    isLoading: boolean;
    error: string | null;
    feature: Feature;
    onLoadMore?: () => void;
    isAppending?: boolean;
}

const ResultDisplay = ({ content, isLoading, error, feature, onLoadMore, isAppending }: ResultDisplayProps) => {
    const formatTextForCopy = (text: string): string => {
        if (feature !== Feature.ScriptureSearch || !text) {
            return text;
        }
        try {
            const data = JSON.parse(text) as ScriptureResultItem[];
            return data.map(item => 
                `[${item.reference}]\n"${item.verse}"\n\n요약 및 적용: ${item.summary}\n\n---\n`
            ).join('');
        } catch (e) {
            return text; // fallback to raw content if parse fails
        }
    };

    const handleCopy = () => {
        const textToCopy = formatTextForCopy(content);
        navigator.clipboard.writeText(textToCopy).catch(err => console.error('Copy failed', err));
    };

    const handleDownload = () => {
        const textToDownload = formatTextForCopy(content);
        const blob = new Blob([textToDownload], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${feature}_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    const getPlaceholderText = () => {
        switch(feature) {
            case Feature.Sermon: return "작성된 설교문 초안이 여기에 표시됩니다.";
            case Feature.Prayer: return "생성된 기도문이 여기에 표시됩니다.";
            case Feature.ScriptureSearch: return "검색된 성경 구절 목록이 여기에 표시됩니다.";
            case Feature.Bulletin: return "생성된 주보 및 공지 내용이 여기에 표시됩니다.";
            case Feature.Communication: return "작성된 맞춤 메시지가 여기에 표시됩니다.";
            case Feature.Events: return "생성된 행사/예식 맞춤 콘텐츠가 여기에 표시됩니다.";
            default: return "AI 생성 결과가 여기에 표시됩니다.";
        }
    }

    const renderContent = () => {
        if (!content) return <div className="text-slate-400 text-center flex items-center justify-center h-full">{getPlaceholderText()}</div>;
        
        if (feature === Feature.ScriptureSearch) {
            try {
                const data = JSON.parse(content);
                if (Array.isArray(data) && data.length > 0) {
                    return <ScriptureSearchResults data={data} />;
                }
                return <SimpleMarkdownParser text="검색 결과가 없거나 형식이 올바르지 않습니다." />;

            } catch (e) {
                // 파싱 실패 시, 일반 텍스트로 렌더링 (예: 에러 메시지)
                return <SimpleMarkdownParser text={content} />;
            }
        }
        return <SimpleMarkdownParser text={content} />;
    };
    
    const canLoadMore = feature === Feature.ScriptureSearch && content && !isLoading && !error;

    return (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 lg:p-8 flex-grow flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-800">AI 생성 결과</h2>
                {content && !isLoading && !error && (
                    <div className="flex space-x-2">
                        <button onClick={handleCopy} className="px-3 py-1.5 text-sm font-semibold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-md transition-colors">복사</button>
                        <button onClick={handleDownload} className="px-3 py-1.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors">다운로드</button>
                    </div>
                )}
            </div>
            <div className="bg-white rounded-lg border border-slate-200 flex-grow p-6 overflow-y-auto relative">
                {isLoading && !isAppending && <div className="absolute inset-0 bg-white/50 flex items-center justify-center"><Spinner /></div>}
                {error && !isLoading && <div className="text-red-500 text-center">{error}</div>}
                {!isLoading && !error && renderContent()}
            </div>
            {canLoadMore && (
                 <div className="mt-4 flex justify-center">
                    <button 
                        onClick={onLoadMore} 
                        disabled={isAppending}
                        className="w-full sm:w-auto flex items-center justify-center bg-slate-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:bg-slate-400 disabled:cursor-not-allowed"
                    >
                        {isAppending ? <Spinner small={true} /> : '결과 더 보기'}
                    </button>
                </div>
            )}
        </div>
    );
};


// --- Feature Components (No changes needed) ---

const SermonGenerator = ({ onGenerate }: { onGenerate: (topic: string, scripture: string, notes: string, styles: SermonStyleKey[]) => void }) => {
    const [topic, setTopic] = useState('');
    const [scripture, setScripture] = useState('');
    const [notes, setNotes] = useState('');
    const [styles, setStyles] = useState<SermonStyleKey[]>([]);

    const handleStyleChange = (style: SermonStyleKey) => {
        setStyles(prev => prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onGenerate(topic, scripture, notes, styles);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="topic" className="block text-sm font-medium text-slate-700 mb-1">설교 주제</label>
                <input type="text" id="topic" value={topic} onChange={e => setTopic(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500" placeholder="예: '믿음의 능력'" required />
            </div>
            <div>
                <label htmlFor="scripture" className="block text-sm font-medium text-slate-700 mb-1">성경 본문</label>
                <input type="text" id="scripture" value={scripture} onChange={e => setScripture(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500" placeholder="예: '히브리서 11:1-6'" required />
            </div>
            <div>
                <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">핵심 메시지 및 메모</label>
                <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="w-full p-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500" placeholder="설교에 포함하고 싶은 핵심 내용이나 예화, 질문 등을 입력하세요."></textarea>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">설교 스타일 (선택)</label>
                <div className="grid grid-cols-2 gap-3">
                    {Object.keys(SERMON_STYLES).map(key => (
                        <label key={key} className="flex items-center space-x-2 p-3 border rounded-md has-[:checked]:bg-sky-50 has-[:checked]:border-sky-400 transition-colors">
                            <input type="checkbox" checked={styles.includes(key as SermonStyleKey)} onChange={() => handleStyleChange(key as SermonStyleKey)} className="h-4 w-4 text-sky-600 border-slate-300 rounded focus:ring-sky-500" />
                            <span className="text-sm text-slate-600">{SERMON_STYLES[key as SermonStyleKey]}</span>
                        </label>
                    ))}
                </div>
            </div>
            <button type="submit" className="w-full bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500">
                설교문 초안 생성
            </button>
        </form>
    );
};

const PrayerGenerator = ({ onGenerate }: { onGenerate: (situation: string, details: string) => void }) => {
    const [situation, setSituation] = useState('주일 낮예배 대표기도');
    const [details, setDetails] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onGenerate(situation, details);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="situation" className="block text-sm font-medium text-slate-700 mb-1">기도 상황</label>
                <input type="text" id="situation" value={situation} onChange={e => setSituation(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500" placeholder="예: 주일 낮예배 대표기도" required />
            </div>
            <div>
                <label htmlFor="details" className="block text-sm font-medium text-slate-700 mb-1">구체적인 내용 또는 기도 제목</label>
                <textarea id="details" value={details} onChange={e => setDetails(e.target.value)} rows={5} className="w-full p-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500" placeholder="나라와 민족, 환우, 교회 행사 등 기도에 포함될 구체적인 내용을 입력하세요."></textarea>
            </div>
            <button type="submit" className="w-full bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-700 transition-colors">
                기도문 생성
            </button>
        </form>
    );
};

const ScriptureSearchGenerator = ({ onGenerate }: { onGenerate: (query: string) => void }) => {
    const [query, setQuery] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        onGenerate(query);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="search-query" className="block text-sm font-medium text-slate-700 mb-1">검색어</label>
                <textarea id="search-query" value={query} onChange={e => setQuery(e.target.value)} rows={4} className="w-full p-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500" placeholder="찾고 싶은 성경 구절, 주제, 또는 단어를 입력하세요. 예: '사랑은 오래 참고', '용서', '요한복음 3:16'" required></textarea>
            </div>
            <button type="submit" className="w-full bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-700 transition-colors">
                성경 구절 검색
            </button>
        </form>
    );
};

const BulletinGenerator = ({ onGenerate }: { onGenerate: (contentType: string, topic: string, info: string) => void }) => {
    const [contentType, setContentType] = useState('주간 광고');
    const [topic, setTopic] = useState('');
    const [info, setInfo] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onGenerate(contentType, topic, info);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="contentType" className="block text-sm font-medium text-slate-700 mb-1">콘텐츠 종류</label>
                <select id="contentType" value={contentType} onChange={e => setContentType(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500">
                    <option>주간 광고</option>
                    <option>목회 칼럼</option>
                    <option>행사 안내</option>
                    <option>새신자 환영</option>
                </select>
            </div>
            <div>
                <label htmlFor="topic" className="block text-sm font-medium text-slate-700 mb-1">주제 또는 행사명</label>
                <input type="text" id="topic" value={topic} onChange={e => setTopic(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500" placeholder="예: '전교인 가을 수련회'" required />
            </div>
            <div>
                <label htmlFor="info" className="block text-sm font-medium text-slate-700 mb-1">포함될 주요 정보</label>
                <textarea id="info" value={info} onChange={e => setInfo(e.target.value)} rows={5} className="w-full p-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500" placeholder="날짜, 시간, 장소, 대상, 회비 등 공지에 필요한 정보를 입력하세요."></textarea>
            </div>
            <button type="submit" className="w-full bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-700 transition-colors">
                주보/공지 내용 생성
            </button>
        </form>
    );
};

const MessageGenerator = ({ onGenerate }: { onGenerate: (messageType: string, situation: string) => void }) => {
    const [messageType, setMessageType] = useState('위로/격려');
    const [situation, setSituation] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onGenerate(messageType, situation);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="messageType" className="block text-sm font-medium text-slate-700 mb-1">메시지 종류</label>
                <select id="messageType" value={messageType} onChange={e => setMessageType(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500">
                    <option>위로/격려</option>
                    <option>새신자 환영</option>
                    <option>심방 일정 안내</option>
                    <option>행사 참여 독려</option>
                </select>
            </div>
            <div>
                <label htmlFor="situation" className="block text-sm font-medium text-slate-700 mb-1">대상 및 상황</label>
                <textarea id="situation" value={situation} onChange={e => setSituation(e.target.value)} rows={5} className="w-full p-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500" placeholder="예: 김 집사님, 수술 후 회복 중" required></textarea>
            </div>
            <button type="submit" className="w-full bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-700 transition-colors">
                맞춤 메시지 생성
            </button>
        </form>
    );
};

const EventGenerator = ({ onGenerate }: { onGenerate: (eventType: string, names: string, details: string, scripture: string) => void }) => {
    const [eventType, setEventType] = useState('결혼예배 설교');
    const [names, setNames] = useState('');
    const [details, setDetails] = useState('');
    const [scripture, setScripture] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onGenerate(eventType, names, details, scripture);
    };

    const getPlaceholder = (field: 'names' | 'details') => {
        switch(eventType) {
            case '결혼예배 설교':
                return field === 'names' ? '예: 김철수 군과 이영희 양' : '두 사람에 대한 이야기, 결혼에 대한 소망 등';
            case '장례예배 설교':
                return field === 'names' ? '예: 故 홍길동 성도' : '고인의 삶, 신앙, 유가족에게 전하고픈 위로 등';
            case '출산/백일 축사':
                return field === 'names' ? '예: 김믿음 아기, 이사랑/박소망 부부' : '아기와 가정에 대한 축복 메시지 등';
            case '입학/졸업 격려사':
                return field === 'names' ? '예: 박지혜 학생' : '진학하는 학교, 전공, 격려하고 싶은 내용 등';
            default:
                return '';
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="eventType" className="block text-sm font-medium text-slate-700 mb-1">행사 종류</label>
                <select id="eventType" value={eventType} onChange={e => setEventType(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500">
                    <option>결혼예배 설교</option>
                    <option>장례예배 설교</option>
                    <option>출산/백일 축사</option>
                    <option>입학/졸업 격려사</option>
                </select>
            </div>
            <div>
                <label htmlFor="names" className="block text-sm font-medium text-slate-700 mb-1">대상</label>
                <input type="text" id="names" value={names} onChange={e => setNames(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500" placeholder={getPlaceholder('names')} required />
            </div>
            <div>
                <label htmlFor="event-details" className="block text-sm font-medium text-slate-700 mb-1">포함될 내용</label>
                <textarea id="event-details" value={details} onChange={e => setDetails(e.target.value)} rows={5} className="w-full p-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500" placeholder={getPlaceholder('details')}></textarea>
            </div>
            <div>
                <label htmlFor="event-scripture" className="block text-sm font-medium text-slate-700 mb-1">참고 성경 구절 (선택)</label>
                <input type="text" id="event-scripture" value={scripture} onChange={e => setScripture(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500" placeholder="예: '고린도전서 13:4-7'" />
            </div>
            <button type="submit" className="w-full bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-700 transition-colors">
                맞춤 콘텐츠 생성
            </button>
        </form>
    );
};


// --- Main App Component ---

const featureConfig = {
    [Feature.Sermon]: { title: "설교 및 예배 준비", icon: SermonIcon, component: SermonGenerator, generator: geminiService.generateSermon },
    [Feature.Prayer]: { title: "기도문 작성", icon: PrayerIcon, component: PrayerGenerator, generator: geminiService.generatePrayer },
    [Feature.ScriptureSearch]: { title: "성경 구절 검색", icon: SearchIcon, component: ScriptureSearchGenerator, generator: geminiService.generateScriptureSearch },
    [Feature.Bulletin]: { title: "주보 및 공지", icon: BulletinIcon, component: BulletinGenerator, generator: geminiService.generateBulletinContent },
    [Feature.Communication]: { title: "성도 소통 지원", icon: MessageIcon, component: MessageGenerator, generator: geminiService.generatePersonalMessage },
    [Feature.Events]: { title: "행사/예식 지원", icon: EventIcon, component: EventGenerator, generator: geminiService.generateEventContent },
    [Feature.QnA]: { title: "무엇이든 물어보세요", icon: QnAIcon, component: () => null, generator: async () => '' },
};

export default function App() {
    const [activeFeature, setActiveFeature] = useState<Feature>(Feature.Sermon);
    const [result, setResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAppending, setIsAppending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastQuery, setLastQuery] = useState('');

    const handleGenerate = useCallback(async (generator: (...args: any[]) => Promise<string>, ...args: any[]) => {
        setIsLoading(true);
        setError(null);
        setResult('');

        if (activeFeature === Feature.ScriptureSearch && typeof args[0] === 'string') {
            setLastQuery(args[0]);
        } else {
            setLastQuery('');
        }

        try {
            const content = await generator(...args);
            setResult(content);
        } catch (e) {
            // geminiService에서 Error 객체를 던지므로, 여기서 메시지를 추출합니다.
            const errorMessage = e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [activeFeature]);

    const handleLoadMore = useCallback(async () => {
        if (!lastQuery || activeFeature !== Feature.ScriptureSearch) return;

        setIsAppending(true);
        setError(null);
        try {
            const newContent = await geminiService.generateScriptureSearch(lastQuery, result);
            
            // [개선 1] 기존 결과 파싱 시 안전을 위해 try-catch 사용
            let oldResults: ScriptureResultItem[] = [];
            try {
                oldResults = result ? JSON.parse(result) : [];
            } catch (parseError) {
                console.error("Failed to parse existing results:", parseError);
                // 파싱 실패 시 기존 결과는 비우고 새 결과만 사용하도록 처리
            }
            
            const newResults: ScriptureResultItem[] = newContent ? JSON.parse(newContent) : [];

            if (newResults.length > 0) {
                setResult(JSON.stringify([...oldResults, ...newResults]));
            } else {
                // [개선 2] 더 이상 결과가 없을 때 사용자 피드백
                alert("더 이상 찾을 수 있는 결과가 없습니다.");
            }

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : '결과를 추가하는 중 알 수 없는 오류가 발생했습니다.';
            setError(errorMessage);
        } finally {
            setIsAppending(false);
        }
    }, [lastQuery, result, activeFeature]);
    
    const selectFeature = (feature: Feature) => {
        setActiveFeature(feature);
        setResult('');
        setError(null);
        setIsLoading(false);
        setIsAppending(false);
        setLastQuery('');
    };

    const CurrentFeatureComponent = featureConfig[activeFeature].component;
    const currentGenerator = featureConfig[activeFeature].generator;
    const onGenerate = (...args: any[]) => handleGenerate(currentGenerator as any, ...args);

    return (
        <div className="bg-slate-100 min-h-screen text-slate-800 flex flex-col lg:flex-row">
            {/* Sidebar */}
            <aside className="lg:w-72 bg-white lg:h-screen lg:fixed top-0 left-0 lg:border-r border-b lg:border-b-0 border-slate-200 flex flex-col">
                <div className="flex items-center space-x-3 p-5 border-b border-slate-200">
                    <LogoIcon className="text-red-600" />
                    <div>
                        <h1 className="font-bold text-lg text-slate-800">목회 동반자 AI</h1>
                        <p className="text-xs text-slate-500">Ministry Companion AI</p>
                    </div>
                </div>
                <nav className="flex-grow p-4">
                    <ul className="space-y-2">
                        {Object.values(Feature).map(featureKey => {
                            const config = featureConfig[featureKey];
                            if (!config) return null;
                            const { title, icon: Icon } = config;
                            const isActive = activeFeature === featureKey;
                            return (
                                <li key={featureKey}>
                                    <button
                                        onClick={() => selectFeature(featureKey)}
                                        className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors ${isActive ? 'bg-sky-100 text-sky-700 font-bold' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'}`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span>{title}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="lg:pl-72 flex-1 flex flex-col">
                {activeFeature === Feature.QnA ? (
                    <QnAChat />
                ) : (
                    <div className="p-4 sm:p-6 lg:p-10 h-full overflow-y-auto">
                        <div className="max-w-7xl mx-auto h-full">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                                {/* Input Panel */}
                                <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 shadow-sm flex flex-col">
                                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex-shrink-0">{featureConfig[activeFeature].title} AI</h2>
                                    <div className="overflow-y-auto flex-grow">
                                        <CurrentFeatureComponent onGenerate={onGenerate as any} />
                                    </div>
                                </div>
                                {/* Output Panel */}
                                <ResultDisplay
                                    content={result}
                                    isLoading={isLoading}
                                    error={error}
                                    feature={activeFeature}
                                    onLoadMore={handleLoadMore}
                                    isAppending={isAppending}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}