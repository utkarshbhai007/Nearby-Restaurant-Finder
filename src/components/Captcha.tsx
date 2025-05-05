import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

interface CaptchaProps {
  onValidate: (isValid: boolean) => void;
}

export function Captcha({ onValidate }: CaptchaProps) {
  const [captchaText, setCaptchaText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isValid, setIsValid] = useState(false);

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let text = '';
    for (let i = 0; i < 6; i++) {
      text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaText(text);
    setUserInput('');
    setIsValid(false);
    onValidate(false);
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setUserInput(input);
    const valid = input === captchaText;
    setIsValid(valid);
    onValidate(valid);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-4">
        <div className="bg-gray-100 p-3 rounded-md">
          <span className="font-mono text-lg tracking-wider select-none"
                style={{
                  fontFamily: 'monospace',
                  letterSpacing: '0.25em',
                  textDecoration: 'line-through',
                  fontStyle: 'italic'
                }}>
            {captchaText}
          </span>
        </div>
        <button
          onClick={generateCaptcha}
          className="p-2 text-gray-600 hover:text-gray-900"
          type="button"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>
      <input
        type="text"
        value={userInput}
        onChange={handleInputChange}
        placeholder="Enter captcha text"
        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}