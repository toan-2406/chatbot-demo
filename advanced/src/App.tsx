import React, { useState, useCallback, useEffect } from 'react';
import { 
  AquacultureService, 
  LLMProviders,
  AquacultureData,
  AquacultureTaskType,
  ILLMProvider
} from 'aquanet-bot-lib';
import { marked } from 'marked';
import { 
  Box, Container, Paper, Typography, TextField, Button, 
  Tab, Tabs, IconButton, Chip, Tooltip, CircularProgress,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
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
import { Refresh, Save, BugReport, Analytics } from '@mui/icons-material';
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
  taskType?: AquacultureTaskType;
  data?: AquacultureData;
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
  const [selectedTask, setSelectedTask] = useState<AquacultureTaskType>(AquacultureTaskType.TECHNICAL_ADVICE);
  const [aquaData, setAquaData] = useState<AquacultureData>({
    environmentalData: {
      waterQuality: {
        temperature: 28,
        pH: 7.5,
        dissolvedOxygen: 5.2,
      }
    },
    biologicalData: {
      species: 'shrimp',
      stage: 'juvenile',
    },
    metadata: {
      farmId: 'farm-123',
      pondId: 'pond-456',
      timestamp: new Date(),
      source: 'user-input'
    }
  });

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

  // Khởi tạo AquacultureService
  const aquaService = new AquacultureService({
    provider: LLMProviders.DEEPSEEK,
    apiKey: API_KEY,
    model: 'deepseek-chat',
    defaultParams: {
      temperature: 0.7,
      maxTokens: 2000,
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() && !selectedTask) return;

    const startTime = Date.now();
    
    try {
      setStreamingAnswer('');
      console.log('Starting API call with task:', selectedTask);
      
      // Thêm câu hỏi vào lịch sử
      const userMessage: ChatMessage = {
        role: 'user',
        content: question || 'Analyze data',
        timestamp: new Date(),
        taskType: selectedTask,
        data: aquaData
      };
      setChatHistory(prev => [...prev, userMessage]);

      // Tạo message assistant trống để chuẩn bị cho streaming
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        taskType: selectedTask
      };
      setChatHistory(prev => [...prev, assistantMessage]);

      // Tạo prompt dựa trên task type và data
      let prompt = '';
      switch (selectedTask) {
        case AquacultureTaskType.WATER_QUALITY_ANALYSIS:
          prompt = `Analyze water quality data:\nTemperature: ${aquaData.environmentalData.waterQuality.temperature}°C\npH: ${aquaData.environmentalData.waterQuality.pH}\nDissolved Oxygen: ${aquaData.environmentalData.waterQuality.dissolvedOxygen} mg/L`;
          break;
        case AquacultureTaskType.DISEASE_DIAGNOSIS:
          prompt = `Diagnose potential diseases for ${aquaData.biologicalData.species} at ${aquaData.biologicalData.stage} stage based on water parameters:\nTemperature: ${aquaData.environmentalData.waterQuality.temperature}°C\npH: ${aquaData.environmentalData.waterQuality.pH}\nDissolved Oxygen: ${aquaData.environmentalData.waterQuality.dissolvedOxygen} mg/L`;
          break;
        // ... other cases with appropriate prompts
        default:
          prompt = `Analyze aquaculture data for ${aquaData.biologicalData.species} at ${aquaData.biologicalData.stage} stage:\n${JSON.stringify(aquaData, null, 2)}`;
      }

      if (question.trim()) {
        prompt += `\n\nUser question: ${question}`;
      }

      console.log('Generated prompt:', prompt);

      // Gọi trực tiếp API thông qua service
      let response = '';
      switch (selectedTask) {
        case AquacultureTaskType.WATER_QUALITY_ANALYSIS:
          response = await aquaService.analyzeWaterQuality(aquaData);
          break;
        case AquacultureTaskType.DISEASE_DIAGNOSIS:
          response = await aquaService.diagnoseDiseases(aquaData);
          break;
        case AquacultureTaskType.FEEDING_OPTIMIZATION:
          response = await aquaService.optimizeFeeding(aquaData);
          break;
        case AquacultureTaskType.GROWTH_PREDICTION:
          response = await aquaService.predictGrowth(aquaData);
          break;
        case AquacultureTaskType.COST_ANALYSIS:
          response = await aquaService.analyzeCosts(aquaData);
          break;
        case AquacultureTaskType.TECHNICAL_ADVICE:
          response = await aquaService.getTechnicalAdvice(aquaData);
          break;
        case AquacultureTaskType.MARKET_ANALYSIS:
          response = await aquaService.analyzeMarket(aquaData);
          break;
        case AquacultureTaskType.ENVIRONMENTAL_IMPACT:
          response = await aquaService.assessEnvironmentalImpact(aquaData);
          break;
      }

      console.log('Received response:', response);

      // Cập nhật chat history với response
      setChatHistory(prev => {
        const newHistory = [...prev];
        newHistory[newHistory.length - 1].content = response;
        return newHistory;
      });

      // Cập nhật analytics
      const responseTime = Date.now() - startTime;
      setAnalyticsData(prev => ({
        labels: [...prev.labels, new Date().toLocaleTimeString()],
        datasets: [{
          ...prev.datasets[0],
          data: [...prev.datasets[0].data, responseTime]
        }]
      }));

      // Cập nhật debug info
      setDebugInfo(prev => ({
        ...prev,
        lastQuery: {
          taskType: selectedTask,
          data: aquaData,
          prompt,
          response,
          responseTime,
          timestamp: new Date().toISOString()
        }
      }));

      setQuestion('');
      setStreamingAnswer('');
    } catch (err) {
      console.error('Error during API call:', err);
      setDebugInfo(prev => ({
        ...prev,
        lastError: err
      }));
    }
  };

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
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Task Type</InputLabel>
              <Select
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value as AquacultureTaskType)}
                label="Task Type"
              >
                {Object.values(AquacultureTaskType).map((task) => (
                  <MenuItem key={task} value={task}>
                    {task.replace(/_/g, ' ').toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={4}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Nhập câu hỏi hoặc để trống để phân tích dữ liệu..."
              variant="outlined"
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={!selectedTask}
                startIcon={streamingAnswer ? <CircularProgress size={20} /> : null}
              >
                {streamingAnswer ? 'Đang xử lý...' : 'Phân tích'}
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
                {msg.taskType && (
                  <Chip 
                    label={msg.taskType.replace(/_/g, ' ').toUpperCase()}
                    color="secondary"
                    size="small"
                  />
                )}
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
                <>
                  <Typography>{msg.content}</Typography>
                  {msg.data && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">Input Data:</Typography>
                      <SyntaxHighlighter language="json" style={githubGist}>
                        {JSON.stringify(msg.data, null, 2)}
                      </SyntaxHighlighter>
                    </Box>
                  )}
                </>
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