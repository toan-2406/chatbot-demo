import React, { useState, useCallback } from 'react';
import { useAquanetBot } from '../../../src';
import { marked } from 'marked';
import './App.css';

const API_KEY = 'sk-771aecff07b648fd8090810d88cec0ec';

// Cấu hình marked
marked.setOptions({
  gfm: true,
  breaks: true
});

function App() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [streamingAnswer, setStreamingAnswer] = useState('');

  const handleStream = useCallback((chunk: string) => {
    setStreamingAnswer(prev => prev + chunk);
  }, []);

  const { loading, error, query } = useAquanetBot({
    config: {
      apiKey: API_KEY,
      baseUrl: 'https://api.deepseek.com/v1',
      temperature: 0.7,
      maxTokens: 2000,
      responseFormat: 'stream',
      onStream: handleStream,
      aquacultureConfig: {
        knowledgeDomains: [
          'farming_techniques',
          'water_quality',
          'disease_management',
          'feed_management',
          'market_analysis'
        ],
        dataSources: ['research_papers', 'industry_standards', 'technical_guidelines'],
        expertiseLevel: 'intermediate',
        language: 'vi',
        useIndustryTerms: true,
        tools: {
          waterCalculator: true,
          farmingCalendar: true,
          alertSystem: true,
          diseaseIdentifier: true,
          feedOptimizer: true
        },
        validation: {
          requireSourceCitation: true,
          confidenceScoring: true,
          expertReviewThreshold: 0.8,
          factCheckSources: ['trusted_research', 'government_data', 'industry_reports']
        },
        customization: {
          speciesSpecific: ['shrimp'],
          farmingMethods: ['intensive', 'semi_intensive'],
          regionalGuidelines: ['mekong_delta'],
          customPrompts: {
            diseaseAlert: "Phát hiện sớm và đề xuất biện pháp xử lý khi phát hiện dấu hiệu bệnh",
            waterQuality: "Theo dõi và đề xuất điều chỉnh các thông số chất lượng nước",
            feedingSchedule: "Tối ưu hóa lịch cho ăn và khẩu phần theo giai đoạn phát triển"
          }
        }
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    try {
      setStreamingAnswer('');
      const response = await query(question);
      setAnswer(response);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  return (
    <div className="container">
      <h1 className="title">Aquanet Bot Demo</h1>
      
      <form onSubmit={handleSubmit} className="form">
        <div className="textarea-container">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Nhập câu hỏi về nuôi trồng thủy sản..."
            className="question-input"
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading || !question.trim()}
          className={`submit-button ${loading ? 'loading' : ''}`}
        >
          {loading ? 'Đang xử lý...' : 'Gửi câu hỏi'}
        </button>
      </form>

      {error && (
        <div className="error-message">
          Lỗi: {error.message}
        </div>
      )}

      {streamingAnswer && (
        <div className="response-container">
          <h3 className="response-title">Câu trả lời:</h3>
          <div 
            className="markdown-content"
            dangerouslySetInnerHTML={{ __html: marked(streamingAnswer) }}
          />
        </div>
      )}
    </div>
  );
}

export default App; 