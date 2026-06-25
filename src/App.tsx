import React, { useState, useRef, useEffect } from 'react';
import { Upload, Film, Image as ImageIcon, Video, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const LOADING_MESSAGES = [
  "Initializing video engine...",
  "Analyzing image features...",
  "Applying temporal dynamics...",
  "Synthesizing motion frames...",
  "Rendering high-quality details...",
  "Adding finishing touches...",
  "Almost there..."
];

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('A beautiful animation of this image');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: number;
    if (isGenerating) {
      interval = window.setInterval(() => {
        setLoadingMessageIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      setError("Please select a valid image file.");
      return;
    }
    setError(null);
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setMimeType(selectedFile.type);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setBase64Image(base64String);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const generateVideo = async () => {
    if (!base64Image) return;
    setIsGenerating(true);
    setError(null);
    setVideoUrl(null);
    setLoadingMessageIdx(0);

    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          imageBytes: base64Image,
          mimeType,
          aspectRatio
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start generation');
      }

      const { operationName } = await res.json();
      pollStatus(operationName);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setIsGenerating(false);
    }
  };

  const pollStatus = async (operationName: string) => {
    try {
      const res = await fetch('/api/video-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName }),
      });

      if (!res.ok) {
        throw new Error('Failed to check status');
      }

      const { done } = await res.json();
      if (done) {
        setVideoUrl(`/api/video-download?operationName=${encodeURIComponent(operationName)}`);
        setIsGenerating(false);
      } else {
        setTimeout(() => pollStatus(operationName), 10000);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while polling');
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setBase64Image(null);
    setVideoUrl(null);
    setError(null);
    setPrompt('A beautiful animation of this image');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-indigo-500/30">
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-24">
        
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl mb-6"
          >
            <Film className="w-8 h-8 text-indigo-400" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
          >
            Animate Images
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-400 max-w-2xl mx-auto"
          >
            Bring your still photos to life using Veo video generations.
          </motion.p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
          <AnimatePresence mode="wait">
            {!previewUrl && !isGenerating && !videoUrl && (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-2xl p-12 text-center hover:bg-slate-800/50 hover:border-indigo-500/50 transition-colors cursor-pointer group"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="bg-slate-800 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="text-xl font-medium mb-2">Upload a photo</h3>
                <p className="text-slate-400 mb-6 max-w-sm">
                  Drag and drop an image here, or click to browse.
                </p>
                <button className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors">
                  Select Image
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </motion.div>
            )}

            {previewUrl && !isGenerating && !videoUrl && (
              <motion.div
                key="config"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                <div>
                  <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Input Image</h3>
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-square flex items-center justify-center">
                    <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                    <button 
                      onClick={reset}
                      className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-sm text-sm px-3 py-1.5 rounded-md text-slate-300 hover:text-white border border-slate-700 hover:bg-slate-800 transition-colors"
                    >
                      Change
                    </button>
                  </div>
                </div>

                <div className="flex flex-col">
                  <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Settings</h3>
                  
                  <div className="space-y-6 flex-grow">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Animation Prompt (Optional)</label>
                      <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-none h-28"
                        placeholder="Describe how the image should animate..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Aspect Ratio</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setAspectRatio('16:9')}
                          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border ${aspectRatio === '16:9' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900'} transition-colors`}
                        >
                          <ImageIcon className="w-4 h-4" />
                          <span>16:9 (Landscape)</span>
                        </button>
                        <button
                          onClick={() => setAspectRatio('9:16')}
                          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border ${aspectRatio === '9:16' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900'} transition-colors`}
                        >
                          <ImageIcon className="w-4 h-4" />
                          <span>9:16 (Portrait)</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={generateVideo}
                    className="w-full mt-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-lg transition-colors flex items-center justify-center gap-2"
                  >
                    Generate Video
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {isGenerating && (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-20 flex flex-col items-center justify-center text-center"
              >
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full" />
                  <Loader2 className="w-16 h-16 text-indigo-400 animate-spin relative" />
                </div>
                <h3 className="text-2xl font-semibold mb-2">Generating Video</h3>
                <p className="text-slate-400 mb-8 max-w-md">
                  This can take a few minutes. Please don't close this tab while we bring your image to life.
                </p>
                <div className="bg-slate-950 border border-slate-800 rounded-lg px-6 py-3 min-w-[280px]">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={loadingMessageIdx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-indigo-300 font-medium text-sm"
                    >
                      {LOADING_MESSAGES[loadingMessageIdx]}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {videoUrl && (
              <motion.div
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center"
              >
                <div className="w-full max-w-3xl bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl mb-8">
                  <video 
                    src={videoUrl} 
                    controls 
                    autoPlay 
                    loop 
                    className="w-full h-auto aspect-video"
                  />
                </div>
                
                <div className="flex gap-4">
                  <a 
                    href={videoUrl}
                    download="generated-video.mp4"
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                  >
                    <Video className="w-5 h-5" />
                    Download Video
                  </a>
                  <button 
                    onClick={reset}
                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium transition-colors"
                  >
                    Create Another
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="mt-6 p-4 bg-red-950/50 border border-red-900/50 text-red-400 rounded-xl text-sm text-center">
              {error}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
