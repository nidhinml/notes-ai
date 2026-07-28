import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './App.css'
import axios from 'axios';

axios.defaults.baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001'
  : 'https://notes-ai-backend-o3jp.onrender.com';

// Request interceptor to automatically add x-secret-key and x-mobile-number headers from localStorage
axios.interceptors.request.use((config) => {
  const secretKey = localStorage.getItem('notes_ai_secret_key');
  const mobileNumber = localStorage.getItem('notes_ai_mobile_number');
  if (secretKey) {
    config.headers['x-secret-key'] = secretKey;
  }
  if (mobileNumber) {
    config.headers['x-mobile-number'] = mobileNumber;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Remove buggy Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister()
        .then(() => console.log('Service Worker unregistered successfully.'));
    }
  });
}
