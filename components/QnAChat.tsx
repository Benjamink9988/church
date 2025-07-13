
import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import saveAs from 'file-saver';

const systemInstruction = `<prompt>
<role>
You are a knowledgeable and supportive consultant for a Presbyterian pastor in South Korea, specializing in church operations, digital ministry, AI integration, and church management. Your role is to provide guidance, insights, and creative ideas to aid in pastoral duties, while respecting the cultural and religious context of the church.
</role>
<instructions>
1. Begin by analyzing the pastor's query to identify which areas (church_operations, digital_ministry, sermons, AI_tools, church_management) are relevant.
2. Use the appropriate tools to provide guidance and insights:
   - For AI integration, use the AI Integration tool to offer insights on incorporating AI into church operations.
   - For creative ideas, use the Creative Idea Generation tool to assist in generating sermon ideas and other creative content.
   - For administrative tasks, use the Administrative Assistance tool to help with church management and operations.
   - For personalized advice on AI tools, use the Personalized AI Tool Advice tool to offer tailored guidance.
3. Offer creative ideas for sermons and digital ministry, ensuring they align with the church's values and mission.
4. Provide personalized advice on using AI tools and strategies for effective church management.
5. Maintain a supportive and advisory tone throughout the interaction, encouraging the pastor to explore new ideas and technologies.
6. Ensure that all guidance is practical, actionable, and culturally sensitive to the context of a Presbyterian church in South Korea.
7. Balance traditional practices with modern technology, respecting religious and cultural nuances.
8. Encourage the pastor to ask follow-up questions or seek further clarification if needed.
Remember to always maintain a respectful and understanding approach, ensuring that all advice aligns with the church's values and mission.
</instructions>
<response_style>
Your responses should be supportive, advisory, and insightful. Use a respectful and understanding tone, ensuring that your guidance is practical and actionable. Encourage exploration of new ideas and technologies while respecting traditional practices and cultural nuances.
</response_style>
<examples>
Example 1: Sermon Creation
<thinking_process>
1. Identify the need for creative sermon ideas.
2. Use the Creative Idea Generation tool to brainstorm sermon topics.
3. Consider cultural and religious context in South Korea.
4. Provide a list of potential sermon topics and themes.
</thinking_process>
<final_response>
### Sermon Ideas
- **Embracing Change**: Discuss the balance between tradition and modernity in faith.
- **Community and Technology**: Explore how digital tools can enhance community engagement.
- **Faith in the Digital Age**: Reflect on maintaining spiritual practices in a tech-driven world.
</final_response>
<follow_up>
'Embracing Change' 설교를 위한 구체적인 성경 본문은 무엇이 있을까요?
디지털 도구를 활용한 성공적인 커뮤니티 참여 사례를 더 알려주세요.
젊은 세대가 공감할 만한 '디지털 시대의 믿음'에 대한 비유가 있을까요?
</follow_up>

Example 2: AI Integration
<thinking_process>
1. Identify the need for AI integration in church operations.
2. Use the AI Integration tool to explore potential applications.
3. Consider the church's current operations and potential areas for improvement.
4. Provide insights on how AI can enhance efficiency and engagement.
</thinking_process>
<final_response>
### AI Integration Insights
- **Automated Scheduling**: Use AI to manage event scheduling and reminders.
- **Virtual Bible Study Groups**: Implement AI-driven platforms for online study sessions.
- **Data-Driven Decision Making**: Utilize AI analytics to understand congregation needs and preferences.
</final_response>
<follow_up>
교회 행사 자동 예약을 위해 추천할 만한 AI 도구가 있나요?
AI 기반 온라인 성경공부 플랫폼의 장단점은 무엇인가요?
교인 데이터 분석 시 주의해야 할 개인정보 보호 문제는 무엇인가요?
</follow_up>
</examples>
<reminder>
- Always tailor advice to the specific context of a Presbyterian church in South Korea.
- Ensure that guidance is practical and actionable.
- Encourage the pastor to explore new ideas and technologies.
- Maintain a respectful and understanding approach to religious and cultural nuances.
- Balance traditional practices with modern technology.
- Ensure all advice aligns with the church's values and mission.
- After providing the final response, always suggest 3-4 relevant follow-up questions.
</reminder>
<output_format>
Structure your output as follows:
<thinking_process>
[Detail your analysis of the pastor's query and the tools used to provide guidance]
</thinking_process>
<final_response>
[Provide your response, including insights, ideas, and advice, using markdown headers for clarity]
</final_response>
<follow_up>
[Provide 3-4 relevant follow-up questions that the user might have. Each question should be on a new line and not numbered.]
</follow_up>
</output_format>
</prompt>`;

interface Message {
  role: 'user' | 'model';
  text: string;
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#f0f2f5',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: '10px 20px',
    borderBottom: '1px solid #ddd',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    zIndex: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
  },
  headerTitle: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#0d3b66',
  },
  headerButton: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 600,
    transition: 'background-color 0.2s ease',
  },
  chatContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
  },
  welcomeContainer: {
    textAlign: 'center',
    padding: '20px 0',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    height: '100%',
  },
  welcomeTitle: {
    fontSize: '1.2rem',
    color: '#333',
    fontWeight: 600,
    marginBottom: '8px',
  },
  welcomeSubtitle: {
    fontSize: '0.9rem',
    color: '#666',
    marginBottom: '24px',
  },
  exampleButtonsContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  exampleButton: {
    backgroundColor: '#ffffff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '12px 20px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 500,
    color: '#0d3b66',
    width: '100%',
    maxWidth: '500px',
    transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
    textAlign: 'left',
  },
  suggestionsContainer: {
    padding: '15px 0 5px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '10px',
  },
  suggestionsTitle: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#555',
    margin: '0 0 5px 0',
  },
  suggestionButton: {
    backgroundColor: '#e9eef6',
    border: '1px solid #d1d9e6',
    borderRadius: '16px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    color: '#0d3b66',
    transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
    textAlign: 'left',
  },
  message: {
    marginBottom: '15px',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '90%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007bff',
    color: 'white',
    borderRadius: '18px 18px 4px 18px',
  },
  modelMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    color: '#333',
    borderRadius: '18px 18px 18px 4px',
    border: '1px solid #e9e9eb',
  },
  messageContent: {
    padding: '12px 18px',
  },
  messageText: {
    whiteSpace: 'pre-wrap',
    margin: 0,
    lineHeight: 1.6,
  },
  inputArea: {
    display: 'flex',
    padding: '15px',
    borderTop: '1px solid #ddd',
    backgroundColor: '#ffffff',
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  textarea: {
    flex: 1,
    padding: '12px 15px',
    fontSize: '1rem',
    borderRadius: '8px',
    border: '1px solid #ccc',
    marginRight: '10px',
    outline: 'none',
    resize: 'none',
    overflowY: 'hidden',
    maxHeight: '150px',
    fontFamily: "'Noto Sans KR', sans-serif"
  },
  button: {
    padding: '12px 20px',
    fontSize: '1rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#007bff',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 'bold',
    alignSelf: 'stretch'
  },
  buttonDisabled: {
    backgroundColor: '#a0c7ff',
    cursor: 'not-allowed',
  },
  typingIndicator: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 15px',
    backgroundColor: '#ffffff',
    borderRadius: '18px 18px 18px 4px',
    border: '1px solid #e9e9eb'
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#8e8e8e',
    margin: '0 3px',
    animation: 'typing 1.4s infinite ease-in-out both'
  }
};

const QnAChat = () => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const examplePrompts = [
    "다음 주일 '감사'를 주제로 한 설교 아이디어를 3가지 제안해 주세요.",
    "MZ세대에게 효과적으로 다가갈 수 있는 디지털 사역 전략이 궁금합니다.",
    "교회 유튜브 채널 성장을 위한 구체적인 팁을 알려주세요.",
    "교회 소그룹 리더들을 위한 효과적인 훈련 프로그램을 기획하고 싶습니다.",
    "교인들의 신앙 성장을 도울 수 있는 심방 질문 리스트를 만들어 주세요.",
    "연말연시 특별 새벽 기도회 포스터에 들어갈 감동적인 문구가 필요합니다."
  ];

  useEffect(() => {
    try {
      if (!process.env.API_KEY) {
        throw new Error("API_KEY is not set");
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const chatSession = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: { systemInstruction },
      });
      setChat(chatSession);
    } catch (e) {
      console.error(e);
      setError('AI 초기화에 실패했습니다. API 키를 확인해주세요.');
    }
  }, []);
  
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading, suggestedQuestions]);

  const parseResponse = (text: string): string => {
    const finalResponseMatch = text.match(/<final_response>([\s\S]*?)<\/final_response>/);
    if (finalResponseMatch && finalResponseMatch[1]) {
      return finalResponseMatch[1].trim();
    }
    // Fallback for cases where the model forgets the wrapper tag
    return text
      .replace(/<thinking_process>[\s\S]*?<\/thinking_process>/g, '')
      .replace(/<follow_up>[\s\S]*?<\/follow_up>/g, '')
      .replace(/<final_response>/g, '')
      .replace(/<\/final_response>/g, '')
      .trim();
  };

  const parseSuggestions = (text: string): string[] => {
    const match = text.match(/<follow_up>([\s\S]*?)<\/follow_up>/);
    if (match && match[1]) {
      return match[1].trim().split('\n').filter(q => q.trim() !== '');
    }
    return [];
  };
  
  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading || !chat) return;

    setSuggestedQuestions([]);
    setUserInput('');
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }
    const userMessage: Message = { role: 'user', text: messageText };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const stream = await chat.sendMessageStream({ message: messageText });
      let modelResponse = '';
      setMessages(prev => [...prev, { role: 'model', text: '' }]);

      for await (const chunk of stream) {
        modelResponse += chunk.text;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = modelResponse;
          return newMessages;
        });
      }
      
      const finalSuggestions = parseSuggestions(modelResponse);
      setSuggestedQuestions(finalSuggestions);

    } catch (e: any) {
      console.error(e);
      setError('답변을 받는 중 오류가 발생했습니다. 다시 시도해주세요.');
      setMessages(prev => [...prev, { role: 'model', text: '죄송합니다. 답변을 생성하는 중에 오류가 발생했습니다.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    sendMessage(userInput);
  };
  
  const handleExampleClick = (prompt: string) => {
    setUserInput(prompt);
    if(textareaRef.current){
        textareaRef.current.focus();
        setTimeout(() => {
            if(textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
            }
        }, 0);
    }
  };
  
  const handleSuggestionClick = (question: string) => {
    sendMessage(question);
  };
  
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFormSubmit();
    }
  };

  const handleSaveAsDocx = async () => {
      if (messages.length === 0) {
          alert("저장할 대화 내용이 없습니다.");
          return;
      }

      const docMessages = messages.map(msg => {
          const roleText = msg.role === 'user' ? "사용자:" : "AI 컨설턴트:";
          const roleParagraph = new Paragraph({
              children: [new TextRun({ text: roleText, bold: true, color: msg.role === 'user' ? "007BFF" : "0D3B66" })],
              spacing: { before: 200 }
          });

          const contentText = msg.role === 'model' ? parseResponse(msg.text) : msg.text;
          const contentParagraphs = contentText.split('\n').filter(line => line.trim()).map(line => {
              if (line.startsWith('### ')) {
                  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(line.substring(4))] });
              }
              if (line.startsWith('- ')) {
                  return new Paragraph({ text: line.substring(2), bullet: { level: 0 } });
              }
              const children = line.split('**').map((part, index) => new TextRun({ text: part, bold: index % 2 === 1 }));
              return new Paragraph({ children });
          });
          
          return [roleParagraph, ...contentParagraphs];
      }).flat();

      const doc = new Document({
          sections: [{
              children: [
                  new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun("목회 AI 컨설턴트 대화 기록")] }),
                  new Paragraph(""),
                  ...docMessages,
              ],
          }],
      });

      try {
        const blob = await Packer.toBlob(doc);
        saveAs(blob, "목회_AI_컨설턴트_대화기록.docx");
      } catch (err) {
        console.error("Error creating DOCX file:", err);
        setError("DOCX 파일을 생성하는 데 실패했습니다.");
      }
  };

  const renderLine = (line: string, key: React.Key) => {
      if (line.startsWith('### ')) {
          return <h3 key={key} style={{ margin: '20px 0 10px 0', paddingBottom: '5px', borderBottom: '1px solid #eee', fontSize: '1.2rem', fontWeight: 600 }}>{line.substring(4)}</h3>;
      }
      if (line.startsWith('- ')) {
          return <li key={key} style={{ marginBottom: '8px', lineHeight: 1.7 }}>{line.substring(2)}</li>;
      }
      if (line.includes('**')) {
          return <p key={key} style={{ margin: '8px 0', lineHeight: 1.7 }}>
              {line.split('**').map((part, index) =>
                  index % 2 === 1 ? <strong key={index}>{part}</strong> : <span key={index}>{part}</span>
              )}
          </p>;
      }
      return <p key={key} style={{ margin: '8px 0', lineHeight: 1.7 }}>{line}</p>;
  };
  
  const renderMarkdown = (text: string) => {
    const parsedText = parseResponse(text);
    const lines = parsedText.split('\n');
    
    const elements: JSX.Element[] = [];
    let listItems: string[] = [];
    let keyCounter = 0;

    for (const line of lines) {
      if (line.trim().startsWith('- ')) {
        listItems.push(line);
      } else {
        if (listItems.length > 0) {
          elements.push(
            <ul key={`ul-${keyCounter++}`} style={{ paddingLeft: '25px', margin: '10px 0' }}>
              {listItems.map((item, index) => renderLine(item, index))}
            </ul>
          );
          listItems = [];
        }
        if (line.trim()) {
            elements.push(renderLine(line, keyCounter++));
        }
      }
    }
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${keyCounter++}`} style={{ paddingLeft: '25px', margin: '10px 0' }}>
          {listItems.map((item, index) => renderLine(item, index))}
        </ul>
      );
    }
    return elements;
  };

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes typing { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1.0); } }
          .dot:nth-child(1) { animation-delay: 0s; }
          .dot:nth-child(2) { animation-delay: 0.2s; }
          .dot:nth-child(3) { animation-delay: 0.4s; }
          .example-button:hover { background-color: #f8f9fa; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
          .suggestion-button:hover { background-color: #dbe4f0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
          .header-button:hover { background-color: #0069d9; }
        `}
      </style>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>목회 AI 컨설턴트</h1>
        <button className="header-button" style={styles.headerButton} onClick={handleSaveAsDocx}>
            Save as DOCX
        </button>
      </header>
      <main style={styles.chatContainer} ref={chatContainerRef}>
        {messages.length === 0 && !isLoading ? (
          <div style={styles.welcomeContainer}>
            <div>
              <h2 style={styles.welcomeTitle}>무엇을 도와드릴까요?</h2>
              <p style={styles.welcomeSubtitle}>아래 예시를 선택하거나 직접 질문을 입력해 보세요.</p>
              <div style={styles.exampleButtonsContainer}>
                {examplePrompts.map((prompt, index) => (
                  <button key={index} className="example-button" style={styles.exampleButton} onClick={() => handleExampleClick(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} style={{...styles.message, ...(msg.role === 'user' ? styles.userMessage : styles.modelMessage)}}>
              <div style={styles.messageContent}>
                <div style={styles.messageText}>
                   {msg.role === 'model' ? renderMarkdown(msg.text) : msg.text}
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && messages.length > 0 && messages[messages.length-1].role === 'user' && (
           <div style={{...styles.message, ...styles.modelMessage}}>
             <div style={styles.typingIndicator}>
              <div style={styles.dot}></div>
              <div style={styles.dot}></div>
              <div style={styles.dot}></div>
            </div>
          </div>
        )}
        {suggestedQuestions.length > 0 && !isLoading && (
            <div style={styles.suggestionsContainer}>
                <p style={styles.suggestionsTitle}>추가 질문 제안:</p>
                {suggestedQuestions.map((q, i) => (
                    <button key={i} className="suggestion-button" style={styles.suggestionButton} onClick={() => handleSuggestionClick(q)}>
                        {q}
                    </button>
                ))}
            </div>
        )}
         {error && <div style={{color: 'red', textAlign: 'center', padding: '10px'}}>{error}</div>}
      </main>
      <form style={styles.inputArea} onSubmit={handleFormSubmit}>
        <textarea
          ref={textareaRef}
          value={userInput}
          onChange={handleTextareaInput}
          onKeyDown={handleKeyDown}
          placeholder="여기에 메시지를 입력하세요... (Shift+Enter로 줄바꿈)"
          style={styles.textarea}
          aria-label="Chat input"
          disabled={isLoading}
          rows={1}
        />
        <button type="submit" style={{...styles.button, ...(isLoading && styles.buttonDisabled)}} disabled={isLoading}>
          Send
        </button>
      </form>
    </div>
  );
};

export default QnAChat;
