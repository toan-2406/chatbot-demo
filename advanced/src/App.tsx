import React, { useState, useCallback, useEffect } from 'react';
import { useAquanetBot } from 'aquanet-bot-lib';
import { marked } from 'marked';
import { Box, Container, Paper, Typography, TextField, Button, 
  Tab, Tabs, IconButton, Chip, Tooltip, CircularProgress } from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend
} from 'chart.js';
import { Refresh, Save, History, BugReport, Analytics } from '@mui/icons-material';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import { githubGist } from 'react-syntax-highlighter/dist/esm/styles/hljs';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend
);

// Register syntax highlighter language
SyntaxHighlighter.registerLanguage('json', json);

const API_KEY = 'sk-771aecff07b648fd8090810d88cec0ec';

// Cấu hình marked
marked.setOptions({
  gfm: true,
  breaks: true
});

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AnalyticsData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    tension: number;
  }[];
}

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [streamingAnswer, setStreamingAnswer] = useState('');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    labels: [],
    datasets: [{
      label: 'Response Time (ms)',
      data: [],
      borderColor: '#3498db',
      tension: 0.4
    }]
  });
  const [debugInfo, setDebugInfo] = useState<any>({});

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

    const startTime = Date.now();
    
    try {
      setStreamingAnswer('');
      setChatHistory(prev => [...prev, {
        role: 'user',
        content: question,
        timestamp: new Date()
      }]);

      const response = await query(question);

      // Add streaming answer to chat history
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: streamingAnswer,
        timestamp: new Date()
      }]);

      // Update analytics
      const responseTime = Date.now() - startTime;
      setAnalyticsData(prev => ({
        labels: [...prev.labels, new Date().toLocaleTimeString()],
        datasets: [{
          ...prev.datasets[0],
          data: [...prev.datasets[0].data, responseTime]
        }]
      }));

      // Update debug info
      setDebugInfo(prev => ({
        ...prev,
        lastQuery: {
          question,
          responseTime,
          timestamp: new Date().toISOString()
        }
      }));

      setQuestion('');
      setStreamingAnswer(''); // Reset streaming answer
    } catch (err) {
      console.error('Error:', err);
      setDebugInfo(prev => ({
        ...prev,
        lastError: err
      }));
    }
  };

  // Add streaming message to chat history
  useEffect(() => {
    if (streamingAnswer && chatHistory.length > 0) {
      const lastMessage = chatHistory[chatHistory.length - 1];
      if (lastMessage.role === 'assistant') {
        // Update last assistant message
        setChatHistory(prev => [
          ...prev.slice(0, -1),
          {
            ...lastMessage,
            content: streamingAnswer
          }
        ]);
      } else {
        // Add new assistant message
        setChatHistory(prev => [...prev, {
          role: 'assistant',
          content: streamingAnswer,
          timestamp: new Date()
        }]);
      }
    }
  }, [streamingAnswer]);

  const clearHistory = () => {
    setChatHistory([]);
    setAnalyticsData({
      labels: [],
      datasets: [{
        ...analyticsData.datasets[0],
        data: []
      }]
    });
  };

  const saveHistory = () => {
    const data = JSON.stringify(chatHistory, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-history-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 4 }}>
        Aquanet Bot Advanced Demo
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="Chat" />
          <Tab label="Analytics" />
          <Tab label="Debug" />
        </Tabs>
      </Box>

      {/* Chat Tab */}
      <Box hidden={activeTab !== 0}>
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Nhập câu hỏi về nuôi trồng thủy sản..."
              variant="outlined"
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading || !question.trim()}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                {loading ? 'Đang xử lý...' : 'Gửi câu hỏi'}
              </Button>
              <Tooltip title="Xóa lịch sử">
                <IconButton onClick={clearHistory} color="default">
                  <Refresh />
                </IconButton>
              </Tooltip>
              <Tooltip title="Lưu lịch sử">
                <IconButton onClick={saveHistory} color="primary">
                  <Save />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Paper>

        {error && (
          <Paper elevation={3} sx={{ p: 2, mb: 3, bgcolor: '#fdf3f2' }}>
            <Typography color="error">Lỗi: {error.message}</Typography>
          </Paper>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {chatHistory.map((msg, idx) => (
            <Paper 
              key={idx} 
              elevation={2}
              sx={{ 
                p: 2,
                bgcolor: msg.role === 'assistant' ? '#f8f9fa' : '#fff',
                borderLeft: msg.role === 'assistant' ? 4 : 0,
                borderColor: 'primary.main'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                <Chip 
                  label={msg.role === 'assistant' ? 'Bot' : 'Bạn'} 
                  color={msg.role === 'assistant' ? 'primary' : 'default'}
                  size="small"
                />
                <Typography variant="caption" color="text.secondary">
                  {msg.timestamp.toLocaleString()}
                </Typography>
              </Box>
              {msg.role === 'assistant' ? (
                <div 
                  className="markdown-content"
                  dangerouslySetInnerHTML={{ __html: marked(msg.content) }}
                />
              ) : (
                <Typography>{msg.content}</Typography>
              )}
            </Paper>
          ))}
        </Box>
      </Box>

      {/* Analytics Tab */}
      <Box hidden={activeTab !== 1}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Phân tích hiệu năng
          </Typography>
          <Box sx={{ height: 400 }}>
            <Line
              data={analyticsData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                  title: {
                    display: true,
                    text: 'Thời gian phản hồi'
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Milliseconds'
                    }
                  }
                }
              }}
            />
          </Box>
        </Paper>
      </Box>

      {/* Debug Tab */}
      <Box hidden={activeTab !== 2}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Debug Information
          </Typography>
          <SyntaxHighlighter language="json" style={githubGist}>
            {JSON.stringify(debugInfo, null, 2)}
          </SyntaxHighlighter>
        </Paper>
      </Box>
    </Container>
  );
}

export default App; 