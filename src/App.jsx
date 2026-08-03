import { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  UserPlus,
  BookOpen,
  FileSpreadsheet,
  Cpu,
  Settings,
  Calendar,
  Search,
  Trash2,
  Edit,
  Download,
  Upload,
  Plus,
  Check,
  AlertTriangle,
  Activity,
  FileText,
  Import,
  RefreshCw,
  Info,
  Menu,
  X,
  Play
} from 'lucide-react';

import './App.css';
import { getKids, saveKids, getSettings, saveSettings } from './utils/db';
import {
  calculateReportData,
  exportKidsToExcel,
  exportReportToExcel,
  exportReportToPDF,
  formatMonthFrench
} from './utils/exports';
import { performOCR } from './utils/ocr';

// Initial Sample Data to help get started
const SAMPLE_KIDS = [
  // Journée du 27/07/2026
  {
    id: 'sample-1',
    date: '2026-07-27',
    motherName: 'DIALLO Maimouna',
    childName: 'Diana',
    age: 12,
    sex: 'F',
    quartier: 'Avotrou',
    phone: '013872',
    weight: 8.5,
    height: 73,
    score: -1,
    pb: 'VERT',
    edema: false,
    temp: 36.8,
    screeningAnemia: false,
    screeningMalnutrition: 'NON'
  },
  {
    id: 'sample-2',
    date: '2026-07-27',
    motherName: 'TOGBE Abiba',
    childName: 'Mabarack',
    age: 12,
    sex: 'M',
    quartier: 'Avotrou',
    phone: '019064',
    weight: 7.2,
    height: 70,
    score: -2, // MAM
    pb: 'JAUNE',
    edema: false,
    temp: 37.2,
    screeningAnemia: false,
    screeningMalnutrition: 'MAM'
  },
  {
    id: 'sample-3',
    date: '2026-07-27',
    motherName: 'KAHHO Scal',
    childName: 'Sidam',
    age: 6,
    sex: 'M',
    quartier: 'Avotrou',
    phone: '014428',
    weight: 7.2,
    height: 69,
    score: -1.5,
    pb: 'VERT',
    edema: false,
    temp: 36.5,
    screeningAnemia: false,
    screeningMalnutrition: 'NON'
  },
  {
    id: 'sample-4',
    date: '2026-07-27',
    motherName: 'ALOUDJINOU Sidonie',
    childName: 'Fiona',
    age: 6,
    sex: 'F',
    quartier: 'Avotrou',
    phone: '014388',
    weight: 5.8,
    height: 63,
    score: -2, // MAM
    pb: 'JAUNE',
    edema: false,
    temp: 36.9,
    screeningAnemia: false,
    screeningMalnutrition: 'MAM'
  },
  {
    id: 'sample-5',
    date: '2026-07-27',
    motherName: 'DOUKOUROU Rachida',
    childName: 'Yikimalow',
    age: 6,
    sex: 'F',
    quartier: 'Avotrou',
    phone: '016667',
    weight: 5.4,
    height: 60,
    score: -2, // MAM
    pb: 'JAUNE',
    edema: false,
    temp: 37.0,
    screeningAnemia: false,
    screeningMalnutrition: 'MAM'
  },
  // Journée du 31/07/2026
  {
    id: 'sample-6',
    date: '2026-07-31',
    motherName: 'VEVE Lea',
    childName: 'Ines',
    age: 9,
    sex: 'F',
    quartier: 'Avotrou',
    phone: '04841',
    weight: 9.0,
    height: 70,
    score: 0,
    pb: 'VERT',
    edema: false,
    temp: 36.4,
    screeningAnemia: false,
    screeningMalnutrition: 'NON'
  },
  {
    id: 'sample-7',
    date: '2026-07-31',
    motherName: 'DANDJINOU Odette',
    childName: 'Miracle',
    age: 10,
    sex: 'M',
    quartier: 'Avotrou',
    phone: '02191',
    weight: 6.2,
    height: 70,
    score: -2, // MAM
    pb: 'JAUNE',
    edema: false,
    temp: 36.8,
    screeningAnemia: false,
    screeningMalnutrition: 'MAM'
  },
  {
    id: 'sample-8',
    date: '2026-07-31',
    motherName: 'NEVE Mireille',
    childName: 'Shalom',
    age: 9,
    sex: 'M',
    quartier: 'Avotrou',
    phone: '0353',
    weight: 5.5,
    height: 62,
    score: -3, // MAS
    pb: 'ROUGE',
    edema: false,
    temp: 37.5,
    screeningAnemia: true,
    screeningMalnutrition: 'MAS'
  }
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [kids, setKids] = useState([]);
  const [settings, setSettings] = useState({
    nurseName: '',
    facilityName: '',
    defaultQuartier: 'Avotrou',
    geminiApiKey: '',
    ocrEngine: 'local'
  });

  // Loading States
  const [isLoading, setIsLoading] = useState(true);

  // Form entries for new kid
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentDayEntries, setCurrentDayEntries] = useState([]);
  const [formData, setFormData] = useState({
    motherName: '',
    childName: '',
    age: '',
    sex: 'F',
    quartier: 'Avotrou',
    phone: '',
    weight: '',
    height: '',
    score: '0',
    pb: 'VERT',
    edema: false,
    temp: '',
    screeningAnemia: false,
    screeningMalnutrition: 'NON'
  });

  // Editing Row State (for Register)
  const [editingKidId, setEditingKidId] = useState(null);
  const [editingFormData, setEditingFormData] = useState(null);

  // Search/Filters for Register
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSex, setFilterSex] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  // Report States
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));

  // Dashboard & Sidebar States
  const [dashboardMonth, setDashboardMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // OCR Import States
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrQueue, setOcrQueue] = useState([]);
  const [ocrSelectedQueueItemId, setOcrSelectedQueueItemId] = useState(null);
  const [ocrParsedRecords, setOcrParsedRecords] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [lastOcrBatchId, setLastOcrBatchId] = useState(localStorage.getItem('lastOcrBatchId') || null);
  const [lastOcrBatchCount, setLastOcrBatchCount] = useState(Number(localStorage.getItem('lastOcrBatchCount')) || 0);

  // Load Data on Mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedKids = await getKids();
        const storedSettings = await getSettings();
        
        if (storedSettings) {
          setSettings({
            ocrEngine: 'local',
            geminiApiKey: '',
            ...storedSettings
          });
          setFormData(prev => ({
            ...prev,
            quartier: storedSettings.defaultQuartier || 'Avotrou'
          }));
        }

        if (storedKids !== null) {
          setKids(storedKids);
        } else {
          // Setup sample data first time (uninitialized DB)
          await saveKids(SAMPLE_KIDS);
          setKids(SAMPLE_KIDS);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);
  // Sync kids database when kids state changes
  const updateKidsInDb = async (updatedKids) => {
    setKids(updatedKids);
    await saveKids(updatedKids);
  };

  // Sync settings database when settings change
  const updateSettingsInDb = async (updatedSettings) => {
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddKidToSession = (e) => {
    e.preventDefault();
    if (!formData.childName || formData.age === '') {
      alert('Veuillez remplir au moins le prénom de l\'enfant et son âge en mois.');
      return;
    }

    // Auto classify malnutrition screening field for convenience
    let autoMalnutrition = 'NON';
    const numScore = parseFloat(formData.score);
    if (numScore === -2) autoMalnutrition = 'MAM';
    else if (numScore === -3) autoMalnutrition = 'MAS';

    const newKid = {
      ...formData,
      id: 'kid_' + Date.now() + Math.random().toString(36).substr(2, 5),
      date: sessionDate,
      age: parseInt(formData.age, 10),
      weight: formData.weight ? parseFloat(formData.weight) : '',
      height: formData.height ? parseFloat(formData.height) : '',
      score: parseFloat(formData.score),
      temp: formData.temp ? parseFloat(formData.temp) : '',
      screeningMalnutrition: autoMalnutrition
    };

    setCurrentDayEntries(prev => [...prev, newKid]);
    
    // Clear form for next entry but preserve date, quartier & phone (often same neighborhood/mothers)
    setFormData(prev => ({
      ...prev,
      motherName: '',
      childName: '',
      age: '',
      weight: '',
      height: '',
      score: '0',
      pb: 'VERT',
      edema: false,
      temp: '',
      screeningAnemia: false,
      screeningMalnutrition: 'NON'
    }));
  };

  const handleRemoveSessionEntry = (index) => {
    setCurrentDayEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveSession = async () => {
    if (currentDayEntries.length === 0) {
      alert('Aucune entrée à enregistrer.');
      return;
    }

    const updatedKids = [...kids, ...currentDayEntries];
    await updateKidsInDb(updatedKids);
    setCurrentDayEntries([]);
    alert('Journée enregistrée avec succès !');
    setActiveTab('register');
  };

  // Delete Child from Register
  const handleDeleteKid = async (id) => {
    if (confirm('Voulez-vous vraiment supprimer cet enfant du registre ?')) {
      const updatedKids = kids.filter(k => k.id !== id);
      await updateKidsInDb(updatedKids);
    }
  };

  // Edit Child in Register
  const startEditKid = (kid) => {
    setEditingKidId(kid.id);
    setEditingFormData({ ...kid });
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditingFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const saveEditKid = async () => {
    const updatedKids = kids.map(k => {
      if (k.id === editingKidId) {
        // Auto update malnutrition class based on edited score
        let autoMalnutrition = 'NON';
        const numScore = parseFloat(editingFormData.score);
        if (numScore === -2) autoMalnutrition = 'MAM';
        else if (numScore === -3) autoMalnutrition = 'MAS';

        const parsedAge = editingFormData.age !== undefined && editingFormData.age !== '' ? parseInt(editingFormData.age, 10) : '';

        return {
          ...editingFormData,
          age: isNaN(parsedAge) ? '' : parsedAge,
          weight: editingFormData.weight ? parseFloat(editingFormData.weight) : '',
          height: editingFormData.height ? parseFloat(editingFormData.height) : '',
          score: parseFloat(editingFormData.score),
          temp: editingFormData.temp ? parseFloat(editingFormData.temp) : '',
          screeningMalnutrition: autoMalnutrition
        };
      }
      return k;
    });

    await updateKidsInDb(updatedKids);
    setEditingKidId(null);
    setEditingFormData(null);
  };

  // Dashboard Stats Calculations
  const dashboardStats = useMemo(() => {
    const monthKids = kids.filter(k => k.date && k.date.startsWith(dashboardMonth));
    const total = monthKids.length;
    let normalCount = 0;
    let mamCount = 0;
    let masCount = 0;

    monthKids.forEach(k => {
      const s = Number(k.score);
      if (s === -3) masCount++;
      else if (s === -2) mamCount++;
      else normalCount++;
    });

    return { total, normalCount, mamCount, masCount };
  }, [kids, dashboardMonth]);

  // Filtered Kids list for Register View
  const filteredKids = useMemo(() => {
    return kids.filter(k => {
      const nameMatch = 
        k.childName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        k.motherName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        k.quartier?.toLowerCase().includes(searchTerm.toLowerCase());

      const sexMatch = !filterSex || k.sex === filterSex;
      
      let statusMatch = true;
      if (filterStatus) {
        const score = Number(k.score);
        if (filterStatus === 'BEN') statusMatch = score !== -2 && score !== -3;
        else if (filterStatus === 'MAM') statusMatch = score === -2;
        else if (filterStatus === 'MAS') statusMatch = score === -3;
      }

      let monthMatch = true;
      if (filterMonth) {
        monthMatch = k.date?.startsWith(filterMonth);
      }

      return nameMatch && sexMatch && statusMatch && monthMatch;
    }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort latest first
  }, [kids, searchTerm, filterSex, filterStatus, filterMonth]);

  // Monthly Report Calculations
  const calculatedReport = useMemo(() => {
    return calculateReportData(kids, reportMonth);
  }, [kids, reportMonth]);

  const reportTotals = useMemo(() => {
    const r = calculatedReport;
    const totalBEN = r.g6_11.M.BEN + r.g6_11.F.BEN + r.g12_59.M.BEN + r.g12_59.F.BEN;
    const totalMAM = r.g6_11.M.MAM + r.g6_11.F.MAM + r.g12_59.M.MAM + r.g12_59.F.MAM;
    const totalMAS = r.g6_11.M.MAS + r.g6_11.F.MAS + r.g12_59.M.MAS + r.g12_59.F.MAS;
    const grandTotal = totalBEN + totalMAM + totalMAS;

    return { totalBEN, totalMAM, totalMAS, grandTotal };
  }, [calculatedReport]);

  // OCR Upload Actions
  const addFilesToQueue = (files) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    
    if (ocrQueue.length + imageFiles.length > 15) {
      alert("La file d'attente ne peut pas contenir plus de 15 images.");
      return;
    }
    
    const newItems = imageFiles.map(file => {
      const id = 'item_' + Date.now() + Math.random().toString(36).substr(2, 5);
      return {
        id,
        file,
        name: file.name,
        url: URL.createObjectURL(file),
        status: 'pending',
        progress: 0,
        error: null
      };
    });
    
    setOcrQueue(prev => {
      const updated = [...prev, ...newItems];
      if (updated.length > 0 && !ocrSelectedQueueItemId) {
        setOcrSelectedQueueItemId(newItems[0].id);
      }
      return updated;
    });
  };

  const handleOcrFileSelect = (e) => {
    const files = Array.from(e.target.files);
    addFilesToQueue(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    addFilesToQueue(files);
  };

  const handleRemoveQueueItem = (id) => {
    setOcrQueue(prev => {
      const updated = prev.filter(item => item.id !== id);
      if (ocrSelectedQueueItemId === id) {
        setOcrSelectedQueueItemId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
  };

  const clearOcrQueue = () => {
    setOcrQueue([]);
    setOcrSelectedQueueItemId(null);
    setOcrParsedRecords([]);
  };

  const runOcrAnalysis = async () => {
    const pendingItems = ocrQueue.filter(item => item.status === 'pending');
    if (pendingItems.length === 0) {
      alert("Aucune image en attente dans la file.");
      return;
    }
    
    if (settings.ocrEngine === 'gemini' && !settings.geminiApiKey) {
      alert('Voulez-vous utiliser l\'OCR Gemini ? Veuillez configurer votre clé API Google Gemini dans l\'onglet "Config" en premier.');
      setActiveTab('settings');
      return;
    }

    setIsOcrLoading(true);

    // Copy queue to process sequentially
    let currentQueue = [...ocrQueue];
    
    for (let i = 0; i < currentQueue.length; i++) {
      const item = currentQueue[i];
      if (item.status !== 'pending') continue;
      
      // Update item status to processing
      setOcrQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'processing', progress: 0 } : q));
      
      try {
        const records = await performOCR(item.file, (progress) => {
          setOcrQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress } : q));
        }, settings);
        
        const finalRecords = records.map(r => {
          let score = r.score !== undefined ? String(r.score) : '0';
          let screeningMalnutrition = 'NON';
          const scoreVal = parseFloat(score);
          if (scoreVal === -2) screeningMalnutrition = 'MAM';
          else if (scoreVal === -3) screeningMalnutrition = 'MAS';
          
          return {
            ...r,
            score,
            screeningMalnutrition,
            date: sessionDate
          };
        });
        
        setOcrParsedRecords(prev => [...prev, ...finalRecords]);
        setOcrQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'completed', progress: 100 } : q));
      } catch (err) {
        console.error('Error processing item:', item.name, err);
        setOcrQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'failed', error: err.message || 'Erreur de lecture' } : q));
      }
    }
    
    setIsOcrLoading(false);
  };

  const handleOcrParsedCellChange = (index, field, value) => {
    setOcrParsedRecords(prev => {
      const copy = [...prev];
      const updatedRow = { ...copy[index], [field]: value };
      
      if (field === 'score') {
        const scoreVal = parseFloat(value);
        if (scoreVal === -2) updatedRow.screeningMalnutrition = 'MAM';
        else if (scoreVal === -3) updatedRow.screeningMalnutrition = 'MAS';
        else updatedRow.screeningMalnutrition = 'NON';
      }
      
      copy[index] = updatedRow;
      return copy;
    });
  };

  const handleRemoveOcrRecord = (index) => {
    setOcrParsedRecords(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveOcrEntries = async () => {
    if (ocrParsedRecords.length === 0) return;
    
    const batchId = 'batch_' + Date.now();
    const finalRecords = ocrParsedRecords.map(r => {
      const scoreVal = parseFloat(r.score);
      let screeningMalnutrition = r.screeningMalnutrition || 'NON';
      if (scoreVal === -2) screeningMalnutrition = 'MAM';
      else if (scoreVal === -3) screeningMalnutrition = 'MAS';
      else screeningMalnutrition = 'NON';

      // Parse age to number safely
      const parsedAge = r.age !== undefined && r.age !== '' ? parseInt(r.age, 10) : '';

      return {
        ...r,
        age: isNaN(parsedAge) ? '' : parsedAge,
        date: sessionDate,
        weight: r.weight ? parseFloat(r.weight) : '',
        height: r.height ? parseFloat(r.height) : '',
        score: isNaN(scoreVal) ? 0 : scoreVal,
        screeningMalnutrition,
        batchId
      };
    });

    const updatedKids = [...kids, ...finalRecords];
    await updateKidsInDb(updatedKids);
    
    // Save batch info for undo
    setLastOcrBatchId(batchId);
    setLastOcrBatchCount(finalRecords.length);
    localStorage.setItem('lastOcrBatchId', batchId);
    localStorage.setItem('lastOcrBatchCount', String(finalRecords.length));

    // Clear OCR state
    setOcrParsedRecords([]);
    setOcrQueue([]);
    setOcrSelectedQueueItemId(null);
    alert('Importation OCR enregistrée avec succès !');
    setActiveTab('register');
  };

  const handleUndoLastOcrImport = async () => {
    if (!lastOcrBatchId) return;
    if (confirm(`Voulez-vous vraiment annuler le dernier import et supprimer les ${lastOcrBatchCount} enfants correspondants ?`)) {
      const updatedKids = kids.filter(k => k.batchId !== lastOcrBatchId);
      await updateKidsInDb(updatedKids);
      
      setLastOcrBatchId(null);
      setLastOcrBatchCount(0);
      localStorage.removeItem('lastOcrBatchId');
      localStorage.removeItem('lastOcrBatchCount');
      alert('Dernier import OCR annulé avec succès.');
    }
  };

  // Backups Import/Export
  const handleBackupExport = () => {
    const backupStr = JSON.stringify({ kids, settings }, null, 2);
    const blob = new Blob([backupStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sauvegarde_suivi_vaccination_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleBackupImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.kids && Array.isArray(data.kids)) {
          if (confirm(`Cette opération va importer ${data.kids.length} fiches. Souhaitez-vous fusionner avec les données actuelles (Oui) ou tout remplacer (Non) ?`)) {
            const mergedKids = [...kids];
            // Avoid duplicates by checking ID
            data.kids.forEach(newKid => {
              if (!mergedKids.some(k => k.id === newKid.id)) {
                mergedKids.push(newKid);
              }
            });
            await updateKidsInDb(mergedKids);
          } else {
            if (confirm('Êtes-vous sûr de vouloir écraser toutes les données actuelles ? Cette action est irréversible.')) {
              await updateKidsInDb(data.kids);
            } else {
              return;
            }
          }
          if (data.settings) {
            await updateSettingsInDb(data.settings);
          }
          alert('Sauvegarde restaurée avec succès !');
          window.location.reload();
        } else {
          alert('Fichier de sauvegarde invalide.');
        }
      } catch (err) {
        alert('Erreur lors de la lecture du fichier.');
      }
    };
    reader.readAsText(file);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem', background: 'var(--bg-app)' }}>
        <RefreshCw className="animate-pulse-soft" size={48} color="var(--primary)" />
        <p style={{ color: 'var(--text-title)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>Chargement de l'application...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Mobile Navigation Drawer */}
      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}>
        <div className={`sidebar-drawer ${isSidebarOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
          <div className="sidebar-header">
            <div className="logo-section">
              <div className="logo-icon">
                <Activity size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.2rem' }}>SuiviVaccin</h1>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>PWA Nutrition & Vaccin</p>
              </div>
            </div>
            <button className="close-btn" onClick={() => setIsSidebarOpen(false)} aria-label="Fermer le menu">
              <X size={24} />
            </button>
          </div>
          <div className="sidebar-links">
            <button 
              className={`sidebar-btn ${activeTab === 'dashboard' ? 'active' : ''}`} 
              onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
            >
              <LayoutDashboard size={20} />
              <span>Tableau de bord</span>
            </button>
            <button 
              className={`sidebar-btn ${activeTab === 'entry' ? 'active' : ''}`} 
              onClick={() => { setActiveTab('entry'); setIsSidebarOpen(false); }}
            >
              <UserPlus size={20} />
              <span>Saisie</span>
              {currentDayEntries.length > 0 && (
                <span className="badge-count">
                  {currentDayEntries.length}
                </span>
              )}
            </button>
            <button 
              className={`sidebar-btn ${activeTab === 'register' ? 'active' : ''}`} 
              onClick={() => { setActiveTab('register'); setIsSidebarOpen(false); }}
            >
              <BookOpen size={20} />
              <span>Registre</span>
            </button>
            <button 
              className={`sidebar-btn ${activeTab === 'report' ? 'active' : ''}`} 
              onClick={() => { setActiveTab('report'); setIsSidebarOpen(false); }}
            >
              <FileSpreadsheet size={20} />
              <span>Rapports</span>
            </button>
            <button 
              className={`sidebar-btn ${activeTab === 'ocr' ? 'active' : ''}`} 
              onClick={() => { setActiveTab('ocr'); setIsSidebarOpen(false); }}
            >
              <Cpu size={20} />
              <span>Import OCR</span>
            </button>
            <button 
              className={`sidebar-btn ${activeTab === 'settings' ? 'active' : ''}`} 
              onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
            >
              <Settings size={20} />
              <span>Config</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Top Bar */}
      <nav className="nav-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="burger-btn" onClick={() => setIsSidebarOpen(true)} aria-label="Ouvrir le menu">
            <Menu size={24} />
          </button>
          
          <div className="logo-section">
            <div className="logo-icon">
              <Activity size={24} />
            </div>
            <div>
              <h1>SuiviVaccin</h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Nutrition & Vaccination PWA</p>
            </div>
          </div>
        </div>

        <div className="nav-links">
          <button className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={18} />
            <span>Tableau de bord</span>
          </button>
          <button className={`nav-btn ${activeTab === 'entry' ? 'active' : ''}`} onClick={() => setActiveTab('entry')}>
            <UserPlus size={18} />
            <span>Saisie</span>
            {currentDayEntries.length > 0 && (
              <span style={{ background: 'var(--danger)', color: '#fff', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '10px', marginLeft: '3px' }}>
                {currentDayEntries.length}
              </span>
            )}
          </button>
          <button className={`nav-btn ${activeTab === 'register' ? 'active' : ''}`} onClick={() => setActiveTab('register')}>
            <BookOpen size={18} />
            <span>Registre</span>
          </button>
          <button className={`nav-btn ${activeTab === 'report' ? 'active' : ''}`} onClick={() => setActiveTab('report')}>
            <FileSpreadsheet size={18} />
            <span>Rapports</span>
          </button>
          <button className={`nav-btn ${activeTab === 'ocr' ? 'active' : ''}`} onClick={() => setActiveTab('ocr')}>
            <Cpu size={18} />
            <span>Import OCR</span>
          </button>
          <button className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <Settings size={18} />
            <span>Config</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="main-content">
        
        {/* VIEW 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in">
            <div className="section-header">
              <div className="section-header-left">
                <h2>Bonjour, {settings.nurseName || 'Infirmière'}</h2>
                <p>Aperçu de l'état nutritionnel pour le mois de <strong>{formatMonthFrench(dashboardMonth)}</strong>.</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label htmlFor="dashboardMonthSelect" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-title)' }}>
                    Mois :
                  </label>
                  <input
                    type="month"
                    id="dashboardMonthSelect"
                    value={dashboardMonth}
                    onChange={(e) => setDashboardMonth(e.target.value)}
                    style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.9rem', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)', outline: 'none' }}
                  />
                </div>
                <button className="btn btn-primary" onClick={() => setActiveTab('entry')}>
                  <Plus size={16} />
                  Nouvelle Saisie
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="dashboard-grid">
              <div className="stat-card">
                <div className="stat-icon-wrapper blue">
                  <BookOpen size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-value">{dashboardStats.total}</span>
                  <span className="stat-label">Enfants Enregistrés</span>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon-wrapper green">
                  <Check size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-value">{dashboardStats.normalCount}</span>
                  <span className="stat-label">BEN (Bon État)</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrapper orange">
                  <AlertTriangle size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-value">{dashboardStats.mamCount}</span>
                  <span className="stat-label">Malnutrition Modérée (MAM)</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrapper red">
                  <AlertTriangle size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-value">{dashboardStats.masCount}</span>
                  <span className="stat-label">Malnutrition Sévère (MAS)</span>
                </div>
              </div>
            </div>

            <div className="dashboard-actions-grid">
              {/* Quick info card */}
              <div className="card">
                <div className="card-title">
                  <h3><Info size={18} /> Raccourcis et Guide rapide</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.95rem' }}>
                  <p>Cette PWA est optimisée pour vous faire gagner du temps lors des rapports de fin de mois :</p>
                  <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <li>
                      <strong>Étape 1 : Saisie de la journée.</strong> Allez dans l'onglet <strong>Saisie</strong>, définissez la date de la journée (ex: 31/07/2026) puis entrez successivement les enfants de la séance. Cliquez sur "Enregistrer la journée" à la fin.
                    </li>
                    <li>
                      <strong>Étape 2 : Registre numérique.</strong> Dans <strong>Registre</strong>, vous pouvez voir tous les enfants saisis, faire des recherches par nom ou quartier, et modifier une fiche en cas d'erreur.
                    </li>
                    <li>
                      <strong>Étape 3 : Export Rapport.</strong> Dans <strong>Rapports</strong>, sélectionnez le mois souhaité et exportez instantanément le tableau de classement requis sous format Excel ou PDF.
                    </li>
                    <li>
                      <strong>Étape 4 : Rattrapage.</strong> Utilisez l'onglet <strong>Import OCR</strong> pour scanner vos pages de registres papier des mois précédents et les importer automatiquement.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Status breakdown circular visual simulator */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="card-title">
                  <h3><Activity size={18} /> Statut Global (%)</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  {dashboardStats.total > 0 ? (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                          <span>Bon État Nutritionnel (BEN)</span>
                          <span>{Math.round((dashboardStats.normalCount / dashboardStats.total) * 100)}%</span>
                        </div>
                        <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${(dashboardStats.normalCount / dashboardStats.total) * 100}%`, height: '100%', background: 'var(--success)' }}></div>
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                          <span>Malnutrition Modérée (MAM)</span>
                          <span>{Math.round((dashboardStats.mamCount / dashboardStats.total) * 100)}%</span>
                        </div>
                        <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${(dashboardStats.mamCount / dashboardStats.total) * 100}%`, height: '100%', background: 'var(--warning)' }}></div>
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                          <span>Malnutrition Sévère (MAS)</span>
                          <span>{Math.round((dashboardStats.masCount / dashboardStats.total) * 100)}%</span>
                        </div>
                        <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${(dashboardStats.masCount / dashboardStats.total) * 100}%`, height: '100%', background: 'var(--danger)' }}></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Aucune donnée disponible.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: FORM ENTRY */}
        {activeTab === 'entry' && (
          <div className="animate-fade-in">
            <div className="section-header">
              <div className="section-header-left">
                <h2>Saisie de Séance (Journée)</h2>
                <p>Saisissez le registre de la journée de vaccination</p>
              </div>
            </div>

            {/* Set Date of Session */}
            <div className="card" style={{ marginBottom: '1.5rem', background: 'var(--primary-light)', borderColor: 'var(--primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="input-group" style={{ flex: '0 0 250px' }}>
                  <label htmlFor="sessionDate" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={16} /> Date de la Journée :
                  </label>
                  <input
                    type="date"
                    id="sessionDate"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    style={{ fontWeight: 'bold', fontSize: '1.05rem', borderColor: 'var(--primary)' }}
                  />
                </div>
                <div style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  ⚠️ Tous les enfants saisis ci-dessous seront rattachés à la journée du <strong>{new Date(sessionDate).toLocaleDateString('fr-FR')}</strong>.
                </div>
              </div>
            </div>

            {/* Quick Saisie Form */}
            <div className="card">
              <div className="card-title">
                <h3>Ajouter un enfant</h3>
              </div>
              <form onSubmit={handleAddKidToSession}>
                <div className="form-grid">
                  <div className="input-group">
                    <label>Nom de la Mère</label>
                    <input
                      type="text"
                      name="motherName"
                      value={formData.motherName}
                      onChange={handleFormChange}
                      placeholder="DIALLO..."
                    />
                  </div>
                  <div className="input-group">
                    <label>Prénom de l'Enfant *</label>
                    <input
                      type="text"
                      name="childName"
                      value={formData.childName}
                      onChange={handleFormChange}
                      placeholder="Diana..."
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Âge (Mois) *</label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleFormChange}
                      min="0"
                      placeholder="Ex: 12"
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Sexe</label>
                    <select name="sex" value={formData.sex} onChange={handleFormChange}>
                      <option value="F">Féminin (F)</option>
                      <option value="M">Masculin (M)</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="input-group">
                    <label>Quartier</label>
                    <input
                      type="text"
                      name="quartier"
                      value={formData.quartier}
                      onChange={handleFormChange}
                      placeholder="Avotrou..."
                    />
                  </div>
                  <div className="input-group">
                    <label>Téléphone</label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleFormChange}
                      placeholder="013872..."
                    />
                  </div>
                  <div className="input-group">
                    <label>Poids (kg)</label>
                    <input
                      type="number"
                      step="0.001"
                      name="weight"
                      value={formData.weight}
                      onChange={handleFormChange}
                      placeholder="8.5"
                    />
                  </div>
                  <div className="input-group">
                    <label>Taille (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      name="height"
                      value={formData.height}
                      onChange={handleFormChange}
                      placeholder="73"
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="input-group">
                    <label>Indice Poids/Taille (Score)</label>
                    <select name="score" value={formData.score} onChange={handleFormChange}>
                      <option value="1.5">+1,5</option>
                      <option value="1">+1</option>
                      <option value="0">0 (Normal)</option>
                      <option value="-1">-1</option>
                      <option value="-1.5">-1,5</option>
                      <option value="-2">-2 (MAM)</option>
                      <option value="-3">-3 (MAS)</option>
                    </select>

                  </div>
                  <div className="input-group">
                    <label>Tour de bras (PB)</label>
                    <select name="pb" value={formData.pb} onChange={handleFormChange}>
                      <option value="VERT">VERT (Normal)</option>
                      <option value="JAUNE">JAUNE (Modéré)</option>
                      <option value="ROUGE">ROUGE (Sévère)</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Œdèmes bilatéraux</label>
                    <div className="radio-group-container">
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="edema"
                          checked={formData.edema === true}
                          onChange={() => setFormData(prev => ({ ...prev, edema: true }))}
                        /> Oui
                      </label>
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="edema"
                          checked={formData.edema === false}
                          onChange={() => setFormData(prev => ({ ...prev, edema: false }))}
                        /> Non
                      </label>
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Température (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      name="temp"
                      value={formData.temp}
                      onChange={handleFormChange}
                      placeholder="36.8"
                    />
                  </div>
                </div>

                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      id="screeningAnemia"
                      name="screeningAnemia"
                      checked={formData.screeningAnemia}
                      onChange={handleFormChange}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="screeningAnemia" style={{ fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
                      Présente des signes d'anémie
                    </label>
                  </div>
                </div>

                <div className="actions-bar" style={{ marginTop: '2rem' }}>
                  <button type="submit" className="btn btn-primary">
                    <Plus size={16} /> Ajouter à la liste
                  </button>
                </div>
              </form>
            </div>

            {/* List of Entries Added in the Session */}
            {currentDayEntries.length > 0 && (
              <div className="card animate-fade-in">
                <div className="card-title">
                  <h3>Session de saisie ({currentDayEntries.length} enfants saisis)</h3>
                  <button className="btn btn-success" onClick={handleSaveSession}>
                    <Check size={16} /> Enregistrer la journée ({currentDayEntries.length})
                  </button>
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Nom Mère</th>
                        <th>Nom Enfant</th>
                        <th>Âge (Mois)</th>
                        <th>Sexe</th>
                        <th>Poids (kg)</th>
                        <th>Taille (cm)</th>
                        <th>Score</th>
                        <th>PB</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentDayEntries.map((kid, index) => {
                        return (
                          <tr key={kid.id}>
                            <td>{kid.motherName}</td>
                            <td><strong>{kid.childName}</strong></td>
                            <td>{kid.age} mois</td>
                            <td><span className={`badge ${kid.sex === 'M' ? 'badge-blue' : 'badge-red'}`}>{kid.sex}</span></td>
                            <td>{kid.weight || '-'}</td>
                            <td>{kid.height || '-'}</td>
                            <td>
                              <span className={`badge ${Number(kid.score) === -3 ? 'badge-red' : Number(kid.score) === -2 ? 'badge-yellow' : 'badge-green'}`}>
                                {kid.score}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${kid.pb === 'ROUGE' ? 'badge-red' : kid.pb === 'JAUNE' ? 'badge-yellow' : 'badge-green'}`}>
                                {kid.pb}
                              </span>
                            </td>
                            <td>
                              <button className="btn-icon-only" style={{ color: 'var(--danger)' }} onClick={() => handleRemoveSessionEntry(index)}>
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: REGISTER */}
        {activeTab === 'register' && (
          <div className="animate-fade-in">
            <div className="section-header">
              <div className="section-header-left">
                <h2>Registre des Enfants</h2>
                <p>Consulter, rechercher et modifier les fiches de vaccination</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-secondary" onClick={() => exportKidsToExcel(kids)}>
                  <Download size={16} /> Exporter (.xlsx)
                </button>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="card">
              <div className="search-filter-bar">
                <div className="search-input-wrapper">
                  <Search size={16} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Rechercher par nom de mère, enfant ou quartier..."
                  />
                </div>
                <div className="filter-selects">
                  <select value={filterSex} onChange={(e) => setFilterSex(e.target.value)}>
                    <option value="">Tous les sexes</option>
                    <option value="M">Garçons (M)</option>
                    <option value="F">Filles (F)</option>
                  </select>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">Tous les scores</option>
                    <option value="BEN">BEN (Bon État)</option>
                    <option value="MAM">MAM (-2)</option>
                    <option value="MAS">MAS (-3)</option>
                  </select>
                  <input
                    type="month"
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    placeholder="Mois de visite"
                  />
                  {(searchTerm || filterSex || filterStatus || filterMonth) && (
                    <button className="btn btn-secondary" onClick={() => { setSearchTerm(''); setFilterSex(''); setFilterStatus(''); setFilterMonth(''); }}>
                      Effacer
                    </button>
                  )}
                </div>
              </div>

              {/* Kids Table */}
              {filteredKids.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  Aucun enfant trouvé pour les critères de recherche.
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Date Visite</th>
                        <th>Nom Mère</th>
                        <th>Prénom Enfant</th>
                        <th>Âge (Mois)</th>
                        <th>Sexe</th>
                        <th>Quartier</th>
                        <th>Poids / Taille</th>
                        <th>Score</th>
                        <th>PB</th>
                        <th>Œdèmes</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredKids.map(kid => {
                        const isEditing = editingKidId === kid.id;
                        
                        if (isEditing) {
                          return (
                            <tr key={kid.id} style={{ background: 'var(--primary-light)' }}>
                              <td>
                                <input
                                  type="date"
                                  name="date"
                                  value={editingFormData.date}
                                  onChange={handleEditChange}
                                  style={{ padding: '0.2rem', width: '120px' }}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  name="motherName"
                                  value={editingFormData.motherName}
                                  onChange={handleEditChange}
                                  style={{ padding: '0.2rem', width: '120px' }}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  name="childName"
                                  value={editingFormData.childName}
                                  onChange={handleEditChange}
                                  style={{ padding: '0.2rem', width: '100px', fontWeight: 'bold' }}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  name="age"
                                  value={editingFormData.age}
                                  onChange={handleEditChange}
                                  min="0"
                                  style={{ padding: '0.2rem', width: '80px' }}
                                />
                              </td>
                              <td>
                                <select name="sex" value={editingFormData.sex} onChange={handleEditChange} style={{ padding: '0.2rem' }}>
                                  <option value="M">M</option>
                                  <option value="F">F</option>
                                </select>
                              </td>
                              <td>
                                <input
                                  type="text"
                                  name="quartier"
                                  value={editingFormData.quartier}
                                  onChange={handleEditChange}
                                  style={{ padding: '0.2rem', width: '80px' }}
                                />
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                  <input
                                    type="number"
                                    step="0.1"
                                    name="weight"
                                    value={editingFormData.weight}
                                    onChange={handleEditChange}
                                    style={{ padding: '0.2rem', width: '50px' }}
                                  />
                                  <span>/</span>
                                  <input
                                    type="number"
                                    step="0.1"
                                    name="height"
                                    value={editingFormData.height}
                                    onChange={handleEditChange}
                                    style={{ padding: '0.2rem', width: '50px' }}
                                  />
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <select name="score" value={editingFormData.score} onChange={handleEditChange} style={{ padding: '0.2rem' }}>
                                    <option value="1.5">+1,5</option>
                                    <option value="1">+1</option>
                                    <option value="0">0</option>
                                    <option value="-1">-1</option>
                                    <option value="-1.5">-1,5</option>
                                    <option value="-2">-2</option>
                                    <option value="-3">-3</option>
                                  </select>

                                </div>
                              </td>
                              <td>
                                <select name="pb" value={editingFormData.pb} onChange={handleEditChange} style={{ padding: '0.2rem' }}>
                                  <option value="VERT">VERT</option>
                                  <option value="JAUNE">JAUNE</option>
                                  <option value="ROUGE">ROUGE</option>
                                </select>
                              </td>
                              <td>
                                <input
                                  type="checkbox"
                                  name="edema"
                                  checked={editingFormData.edema}
                                  onChange={handleEditChange}
                                />
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                  <button className="btn-icon-only" style={{ color: 'var(--success)', borderColor: 'var(--success)' }} onClick={saveEditKid}>
                                    <Check size={14} />
                                  </button>
                                  <button className="btn-icon-only" onClick={() => { setEditingKidId(null); setEditingFormData(null); }}>
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={kid.id}>
                            <td>{new Date(kid.date).toLocaleDateString('fr-FR')}</td>
                            <td>{kid.motherName || '-'}</td>
                            <td><strong>{kid.childName}</strong></td>
                            <td>{kid.age} mois</td>
                            <td>
                              <span className={`badge ${kid.sex === 'M' ? 'badge-blue' : 'badge-red'}`}>{kid.sex}</span>
                            </td>
                            <td>{kid.quartier || '-'}</td>
                            <td>{kid.weight && kid.height ? `${kid.weight}kg / ${kid.height}cm` : '-'}</td>
                            <td>
                              <span className={`badge ${Number(kid.score) === -3 ? 'badge-red' : Number(kid.score) === -2 ? 'badge-yellow' : 'badge-green'}`}>
                                {kid.score}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${kid.pb === 'ROUGE' ? 'badge-red' : kid.pb === 'JAUNE' ? 'badge-yellow' : 'badge-green'}`}>
                                {kid.pb}
                              </span>
                            </td>
                            <td>{kid.edema ? <span className="badge badge-red">OUI</span> : 'NON'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button className="btn-icon-only" onClick={() => startEditKid(kid)}>
                                  <Edit size={14} />
                                </button>
                                <button className="btn-icon-only" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteKid(kid.id)}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 4: REPORTS */}
        {activeTab === 'report' && (
          <div className="animate-fade-in">
            <div className="section-header">
              <div className="section-header-left">
                <h2>Rapport de Classement Nutritionnel</h2>
                <p>Générez les comptes de malnutrition mensuels par tranche d'âge et sexe</p>
              </div>
            </div>

            {/* Month Selection */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div className="input-group" style={{ flex: '0 0 250px' }}>
                  <label>Sélectionner le Mois :</label>
                  <input
                    type="month"
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    style={{ fontWeight: 'bold', fontSize: '1.05rem' }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => exportReportToExcel(calculatedReport, reportMonth)}>
                    <Download size={16} /> Exporter Excel (.xlsx)
                  </button>
                  <button className="btn btn-primary" onClick={() => exportReportToPDF(calculatedReport, reportMonth, settings)}>
                    <FileText size={16} /> Exporter PDF
                  </button>
                </div>
              </div>
            </div>

            {/* Report Content Table */}
            <div className="card">
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.35rem', marginBottom: '0.25rem' }}>RANGEMENT MENSUEL DES ENFANTS</h3>
                <p style={{ color: 'var(--text-muted)' }}>Période de rapport : <strong>{formatMonthFrench(reportMonth)}</strong></p>
              </div>

              <div className="table-container report-grid-table">
                <table>
                  <thead>
                    <tr>
                      <th rowSpan="2" style={{ verticalAlign: 'middle' }}>Groupe d'âge</th>
                      <th rowSpan="2" style={{ verticalAlign: 'middle' }}>Sexe</th>
                      <th colSpan="3" style={{ textAlign: 'center' }}>Classement Statut Nutritionnel (Score)</th>
                      <th rowSpan="2" style={{ verticalAlign: 'middle', textAlign: 'center' }}>Total</th>
                    </tr>
                    <tr>
                      <th style={{ textAlign: 'center' }}>BEN (Bon État)<br/><span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>(Scores: 0, 1, 1.5, -1, -1.5)</span></th>
                      <th style={{ textAlign: 'center' }}>MAM (Modérée)<br/><span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>(Score: -2)</span></th>
                      <th style={{ textAlign: 'center' }}>MAS (Sévère)<br/><span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>(Score: -3)</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Age Group 1: 6-11 months */}
                    <tr>
                      <td rowSpan="2" style={{ fontWeight: 'bold', verticalAlign: 'middle', borderRight: '1px solid var(--border)' }}>
                        Enfants de 6 à 11 mois
                      </td>
                      <td>Garçons (M)</td>
                      <td>{calculatedReport.g6_11.M.BEN}</td>
                      <td><strong>{calculatedReport.g6_11.M.MAM}</strong></td>
                      <td><strong style={{ color: 'var(--danger)' }}>{calculatedReport.g6_11.M.MAS}</strong></td>
                      <td style={{ fontWeight: 'bold' }}>
                        {calculatedReport.g6_11.M.BEN + calculatedReport.g6_11.M.MAM + calculatedReport.g6_11.M.MAS}
                      </td>
                    </tr>
                    <tr>
                      <td>Filles (F)</td>
                      <td>{calculatedReport.g6_11.F.BEN}</td>
                      <td><strong>{calculatedReport.g6_11.F.MAM}</strong></td>
                      <td><strong style={{ color: 'var(--danger)' }}>{calculatedReport.g6_11.F.MAS}</strong></td>
                      <td style={{ fontWeight: 'bold' }}>
                        {calculatedReport.g6_11.F.BEN + calculatedReport.g6_11.F.MAM + calculatedReport.g6_11.F.MAS}
                      </td>
                    </tr>

                    {/* Age Group 2: 12-59 months */}
                    <tr style={{ borderTop: '2px solid var(--text-title)' }}>
                      <td rowSpan="2" style={{ fontWeight: 'bold', verticalAlign: 'middle', borderRight: '1px solid var(--border)' }}>
                        Enfants de 1 an et plus
                      </td>
                      <td>Garçons (M)</td>
                      <td>{calculatedReport.g12_59.M.BEN}</td>
                      <td><strong>{calculatedReport.g12_59.M.MAM}</strong></td>
                      <td><strong style={{ color: 'var(--danger)' }}>{calculatedReport.g12_59.M.MAS}</strong></td>
                      <td style={{ fontWeight: 'bold' }}>
                        {calculatedReport.g12_59.M.BEN + calculatedReport.g12_59.M.MAM + calculatedReport.g12_59.M.MAS}
                      </td>
                    </tr>
                    <tr>
                      <td>Filles (F)</td>
                      <td>{calculatedReport.g12_59.F.BEN}</td>
                      <td><strong>{calculatedReport.g12_59.F.MAM}</strong></td>
                      <td><strong style={{ color: 'var(--danger)' }}>{calculatedReport.g12_59.F.MAS}</strong></td>
                      <td style={{ fontWeight: 'bold' }}>
                        {calculatedReport.g12_59.F.BEN + calculatedReport.g12_59.F.MAM + calculatedReport.g12_59.F.MAS}
                      </td>
                    </tr>

                    {/* Grand Totals */}
                    <tr className="report-total-row">
                      <td colSpan="2" style={{ textAlign: 'left', paddingLeft: '1.5rem' }}>TOTAL GENERAL</td>
                      <td>{reportTotals.totalBEN}</td>
                      <td>{reportTotals.totalMAM}</td>
                      <td>{reportTotals.totalMAS}</td>
                      <td>{reportTotals.grandTotal}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 5: OCR IMPORT */}
        {activeTab === 'ocr' && (
          <div className="animate-fade-in">
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div className="section-header-left">
                <h2>Rattrapage Historique (Import OCR)</h2>
                <p>Mettez en queue jusqu'à 15 photos de registre papier pour les numériser en lot</p>
              </div>
              {lastOcrBatchId && (
                <button
                  className="btn btn-secondary"
                  onClick={handleUndoLastOcrImport}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: 'var(--danger)',
                    borderColor: 'rgba(239, 68, 68, 0.2)'
                  }}
                >
                  <Trash2 size={16} /> Annuler le dernier import ({lastOcrBatchCount} enfants)
                </button>
              )}
            </div>

            {/* OCR Main Card */}
            <div className="card">
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', background: 'var(--primary-light)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--primary)' }}>
                <Calendar size={20} color="var(--primary)" />
                <div style={{ flex: 1 }}>
                  <label htmlFor="ocrDate" style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Assigner la date de visite à ces lignes :</label>
                  <input
                    type="date"
                    id="ocrDate"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    style={{ marginLeft: '1rem', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.95rem' }}
                  />
                </div>
              </div>

              {/* Upload Drop Zone */}
              <div
                className={`ocr-upload-area ${isDragging ? 'dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('ocr-file-picker').click()}
                style={{ marginBottom: '1.5rem', border: '2px dashed var(--primary)', borderRadius: '8px', padding: '2rem', textAlign: 'center', cursor: 'pointer', background: isDragging ? 'var(--primary-light)' : 'transparent', transition: 'all 0.2s ease' }}
              >
                <Upload size={48} className="ocr-upload-icon" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
                <div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Ajouter des photos de registre</h3>
                  <p style={{ color: 'var(--text-muted)' }}>Glissez et déposez jusqu'à 15 images ici, ou cliquez pour parcourir</p>
                </div>
                <input
                  type="file"
                  id="ocr-file-picker"
                  accept="image/*"
                  onChange={handleOcrFileSelect}
                  multiple
                  style={{ display: 'none' }}
                />
              </div>

              {/* Queue Dashboard */}
              {ocrQueue.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>File d'attente ({ocrQueue.length} / 15)</h3>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button className="btn btn-secondary" onClick={clearOcrQueue} disabled={isOcrLoading}>
                        Vider la file
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={runOcrAnalysis}
                        disabled={isOcrLoading || ocrQueue.filter(item => item.status === 'pending').length === 0}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        {isOcrLoading ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} />}
                        Lancer l'analyse de la file
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                    {ocrQueue.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setOcrSelectedQueueItemId(item.id)}
                        style={{
                          border: `1px solid ${ocrSelectedQueueItemId === item.id ? 'var(--primary)' : 'var(--border)'}`,
                          borderRadius: '8px',
                          padding: '0.75rem',
                          background: ocrSelectedQueueItemId === item.id ? 'var(--primary-light)' : 'var(--card-bg)',
                          cursor: 'pointer',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <img
                            src={item.url}
                            alt={item.name}
                            style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)' }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                              {item.status === 'pending' && <span style={{ color: 'var(--text-muted)' }}>En attente</span>}
                              {item.status === 'processing' && <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Lecture...</span>}
                              {item.status === 'completed' && <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>Terminé</span>}
                              {item.status === 'failed' && <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>Erreur</span>}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveQueueItem(item.id);
                            }}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '0.25rem'
                            }}
                            disabled={isOcrLoading}
                          >
                            <X size={16} />
                          </button>
                        </div>

                        {item.status === 'processing' && (
                          <div className="ocr-progress-bar" style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div className="ocr-progress-fill" style={{ height: '100%', width: `${item.progress}%`, background: 'var(--primary)', transition: 'width 0.2s ease' }}></div>
                          </div>
                        )}
                        
                        {item.error && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--danger)', marginTop: '0.25rem', wordBreak: 'break-word' }}>
                            {item.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview of the Selected Queue Item Image */}
              {ocrSelectedQueueItemId && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>
                    Aperçu de l'image sélectionnée : {ocrQueue.find(q => q.id === ocrSelectedQueueItemId)?.name}
                  </h4>
                  <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5', borderRadius: '8px', padding: '1rem', maxHeight: '400px', overflow: 'auto' }}>
                    <img
                      src={ocrQueue.find(q => q.id === ocrSelectedQueueItemId)?.url}
                      alt="Aperçu"
                      style={{ maxWidth: '100%', maxHeight: '350px', objectFit: 'contain' }}
                    />
                  </div>
                </div>
              )}

              {/* Validation Table for OCR entries */}
              {ocrParsedRecords.length > 0 && (
                <div className="card animate-fade-in" style={{ marginTop: '2rem', border: '1px solid var(--border)', background: 'var(--card-bg)' }}>
                  <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold' }}>Validation des lignes détectées ({ocrParsedRecords.length})</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Modifiez les cases ci-dessous si des erreurs de lecture se sont glissées</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button className="btn btn-secondary" onClick={() => setOcrParsedRecords([])}>Effacer les résultats</button>
                      <button className="btn btn-success" onClick={handleSaveOcrEntries} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Check size={16} /> Enregistrer ces {ocrParsedRecords.length} fiches
                      </button>
                    </div>
                  </div>
                  
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Nom Mère</th>
                          <th>Prénom Enfant</th>
                          <th>Âge (Mois)</th>
                          <th>Sexe</th>
                          <th>Quartier</th>
                          <th>Poids (kg)</th>
                          <th>Taille (cm)</th>
                          <th>Score (IPT)</th>
                          <th>Texte Brut Détecté</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ocrParsedRecords.map((rec, index) => (
                          <tr key={rec.id || index}>
                            <td>
                              <input
                                type="text"
                                value={rec.motherName}
                                onChange={(e) => handleOcrParsedCellChange(index, 'motherName', e.target.value)}
                                className="cell-input"
                                style={{ fontWeight: '600' }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={rec.childName}
                                onChange={(e) => handleOcrParsedCellChange(index, 'childName', e.target.value)}
                                className="cell-input"
                                style={{ fontWeight: 'bold' }}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={rec.age}
                                onChange={(e) => handleOcrParsedCellChange(index, 'age', e.target.value)}
                                className="cell-input"
                                min="0"
                                placeholder="Mois"
                              />
                            </td>
                            <td>
                              <select
                                value={rec.sex}
                                onChange={(e) => handleOcrParsedCellChange(index, 'sex', e.target.value)}
                                className="cell-select"
                              >
                                <option value="M">M</option>
                                <option value="F">F</option>
                              </select>
                            </td>
                            <td>
                              <input
                                type="text"
                                value={rec.quartier}
                                onChange={(e) => handleOcrParsedCellChange(index, 'quartier', e.target.value)}
                                className="cell-input"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.1"
                                value={rec.weight}
                                onChange={(e) => handleOcrParsedCellChange(index, 'weight', e.target.value)}
                                className="cell-input"
                                placeholder="kg"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={rec.height}
                                onChange={(e) => handleOcrParsedCellChange(index, 'height', e.target.value)}
                                className="cell-input"
                                placeholder="cm"
                              />
                            </td>
                            <td>
                              <select
                                value={rec.score}
                                onChange={(e) => handleOcrParsedCellChange(index, 'score', e.target.value)}
                                className="cell-select"
                              >
                                <option value="1.5">+1,5</option>
                                <option value="1">+1</option>
                                <option value="0">0</option>
                                <option value="-1">-1</option>
                                <option value="-1.5">-1,5</option>
                                <option value="-2">-2 (MAM)</option>
                                <option value="-3">-3 (MAS)</option>
                              </select>
                            </td>
                            <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'normal', maxWidth: '200px' }}>
                              <code>{rec.rawText}</code>
                            </td>
                            <td>
                              <button className="btn-icon-only" style={{ color: 'var(--danger)' }} onClick={() => handleRemoveOcrRecord(index)}>
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 6: CONFIGURATION / SETTINGS */}
        {activeTab === 'settings' && (
          <div className="animate-fade-in">
            <div className="section-header">
              <div className="section-header-left">
                <h2>Configuration & Sauvegarde</h2>
                <p>Gérez les informations de l'infirmière, de la structure et vos sauvegardes locales</p>
              </div>
            </div>

            <div className="card">
              <div className="card-title">
                <h3>Informations du Centre</h3>
              </div>
              <div className="form-grid">
                <div className="input-group">
                  <label>Nom & Prénoms de l'Infirmière</label>
                  <input
                    type="text"
                    value={settings.nurseName}
                    onChange={(e) => updateSettingsInDb({ ...settings, nurseName: e.target.value })}
                    placeholder="Ex: Madame Diallo..."
                  />
                </div>
                <div className="input-group">
                  <label>Nom de la Structure de Santé</label>
                  <input
                    type="text"
                    value={settings.facilityName}
                    onChange={(e) => updateSettingsInDb({ ...settings, facilityName: e.target.value })}
                    placeholder="Ex: CS Avotrou..."
                  />
                </div>
                <div className="input-group">
                  <label>Quartier par défaut pour les saisies</label>
                  <input
                    type="text"
                    value={settings.defaultQuartier}
                    onChange={(e) => updateSettingsInDb({ ...settings, defaultQuartier: e.target.value })}
                    placeholder="Ex: Avotrou..."
                  />
                </div>
              </div>
            </div>



            <div className="card">
              <div className="card-title">
                <h3>Configuration OCR & Numérisation</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>Moteur d'OCR préféré</label>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="ocrEngine"
                        value="local"
                        checked={settings.ocrEngine === 'local'}
                        onChange={(e) => updateSettingsInDb({ ...settings, ocrEngine: e.target.value })}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>Tesseract.js (Local, 100% hors-ligne)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="ocrEngine"
                        value="gemini"
                        checked={settings.ocrEngine === 'gemini'}
                        onChange={(e) => updateSettingsInDb({ ...settings, ocrEngine: e.target.value })}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>Google Gemini Flash AI (Haute précision, nécessite internet)</span>
                    </label>
                  </div>
                </div>

                {settings.ocrEngine === 'gemini' && (
                  <div style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>Clé API Google Gemini AI Studio</label>
                      <input
                        type="password"
                        value={settings.geminiApiKey || ''}
                        onChange={(e) => updateSettingsInDb({ ...settings, geminiApiKey: e.target.value })}
                        placeholder="AIzaSy..."
                        style={{ width: '100%', fontFamily: 'monospace' }}
                      />
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      Le modèle Gemini Flash permet de déchiffrer avec une précision chirurgicale les tableaux de registres manuscrits ou photographiés.
                      Vous pouvez créer une clé API gratuite en 1 minute sur le site <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Google AI Studio</a>.
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-title">
                <h3><Download size={18} /> Sauvegarde & Restauration</h3>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                Toutes vos données sont stockées localement dans ce navigateur. Pour ne pas les perdre si vous changez de téléphone ou d'ordinateur, exportez régulièrement votre fichier de sauvegarde.
              </p>
              
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={handleBackupExport}>
                  <Download size={16} /> Télécharger la sauvegarde (.json)
                </button>
                
                <button className="btn btn-secondary" onClick={() => document.getElementById('backup-file-picker').click()}>
                  <Import size={16} /> Restaurer une sauvegarde (.json)
                </button>
                <input
                  type="file"
                  id="backup-file-picker"
                  accept=".json"
                  onChange={handleBackupImport}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            <div className="card" style={{ borderColor: 'var(--danger-bg)' }}>
              <div className="card-title" style={{ borderBottomColor: 'var(--danger-bg)' }}>
                <h3 style={{ color: 'var(--danger)' }}><AlertTriangle size={18} /> Zone de danger</h3>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                Gérez la suppression complète des données de l'application ou la réinitialisation aux données de démonstration.
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button className="btn btn-danger" onClick={async () => {
                  if (confirm('Voulez-vous vraiment effacer TOUTES les données ? Cette action est définitive.')) {
                    await saveKids([]);
                    window.location.reload();
                  }
                }}>
                  Effacer toutes les fiches enfants
                </button>
                
                <button className="btn btn-secondary" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={async () => {
                  if (confirm('Voulez-vous recharger les données de démonstration ? Vos données actuelles seront remplacées.')) {
                    await saveKids(SAMPLE_KIDS);
                    window.location.reload();
                  }
                }}>
                  Recharger les données démo
                </button>
              </div>
            </div>
          </div>
        )}
        
      </main>
      
      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '1rem 2rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
        <p>© 2026 SuiviVaccin - Développé avec soin pour maman. Fonctionne 100% hors-ligne.</p>
      </footer>
    </div>
  );
}

export default App;
