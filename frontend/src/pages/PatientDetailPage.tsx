import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import firebaseService from '../services/firebaseService';
import type { Patient, Consultation, Task } from '../types';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const PatientDetailPage: React.FC = () => {
  const { id } = useParams();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const lastN = (n: number) => consultations.slice(-n);

  useEffect(() => {
    let unsubConsults: () => void = () => {};
    let unsubTasks: () => void = () => {};

    const load = async () => {
      try {
        if (!id) return;
        const p = await firebaseService.getPatients(undefined);
        const found = p.data.find(x => x.id === id) || null;
        setPatient(found);
        // stream related
        unsubConsults = firebaseService.streamConsultations(id, found?.hospitalId, (resp) => {
          setConsultations(resp.data);
        });
        unsubTasks = firebaseService.streamTasks(found?.hospitalId, undefined, undefined, (resp) => {
          setTasks(resp.data.filter(t => t.patientId === id));
        });
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { unsubConsults(); unsubTasks(); };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-6">
        <Link to="/patients" className="inline-flex items-center text-primary-600 hover:underline">
          <ArrowLeftIcon className="h-5 w-5 mr-1" /> Back to Patients
        </Link>
        <div className="mt-6">Patient not found.</div>
      </div>
    );
  }

  const nextAppt = consultations.find(c => !!(c as any).followUpDate) as any;
  const weightSeries = lastN(10).map(c => ({ x: new Date(c.consultationDate).toLocaleDateString(), y: c.weightKg ?? null }));
  const bpSeries = lastN(10).map(c => ({ x: new Date(c.consultationDate).toLocaleDateString(), y1: c.vitals?.bpSystolic ?? null, y2: c.vitals?.bpDiastolic ?? null }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <Link to="/patients" className="inline-flex items-center text-primary-600 hover:underline">
            <ArrowLeftIcon className="h-5 w-5 mr-1" /> Back to Patients
          </Link>
          <h1 className="text-3xl font-extrabold">Patient Details</h1>
        </div>

        {/* Patient summary */}
        <div className="bg-white rounded-2xl shadow p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="text-lg font-semibold">{patient.fullName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">CC Number</p>
            <p className="text-lg font-semibold">{patient.ccNumber}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="text-lg font-semibold">{patient.status.replace(/_/g,' ').toUpperCase()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Age / Gender</p>
            <p className="text-lg font-semibold">{patient.age} / {patient.gender}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="text-lg font-semibold">{patient.phoneNumber || patient.phone || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Next Appointment</p>
            <p className="text-lg font-semibold">{nextAppt?.followUpDate ? new Date(nextAppt.followUpDate).toLocaleDateString() : '-'}</p>
          </div>
        </div>

        {/* Consultations */}
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Consultations</h2>
          </div>
          {/* Trend mini-charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="text-sm text-gray-500 mb-2">Weight (last 10)</div>
              <div className="flex items-end gap-2 h-24">
                {weightSeries.map((p, i) => {
                  const h = p.y ? (Math.min(100, Math.max(0, Number(p.y))) / 2) : 0;
                  return (
                    <div key={i} title={`${p.x}: ${p.y ?? '-'}`} className="flex-1 bg-primary-200" style={{ height: h + '%' }}></div>
                  );
                })}
              </div>
              <div className="mt-1 text-[10px] text-gray-400">Most recent on right</div>
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="text-sm text-gray-500 mb-2">Blood Pressure (last 10)</div>
              <div className="flex items-end gap-2 h-24">
                {bpSeries.map((p, i) => {
                  const h1 = p.y1 ? (Math.min(100, Math.max(0, Number(p.y1))) / 2) : 0;
                  const h2 = p.y2 ? (Math.min(100, Math.max(0, Number(p.y2))) / 2) : 0;
                  return (
                    <div key={i} className="flex-1 flex items-end gap-1" title={`${p.x}: ${p.y1 ?? '-'} / ${p.y2 ?? '-'}`}>
                      <div className="bg-rose-300 w-1/2" style={{ height: h1 + '%' }}></div>
                      <div className="bg-rose-500 w-1/2" style={{ height: h2 + '%' }}></div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 text-[10px] text-gray-400">Most recent on right</div>
            </div>
          </div>
          <div className="divide-y">
            {consultations.map((c) => (
              <div key={c.id} className="py-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="font-semibold">{new Date(c.consultationDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Diagnosis</p>
                  <p className="font-semibold">{c.diagnosis || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Weight/Height</p>
                  <p className="font-semibold">{c.weightKg ?? '-'} kg / {c.heightCm ?? '-'} cm</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Vitals</p>
                  <p className="font-semibold text-sm">T: {c.vitals?.temperatureC ?? '-'}°C, P: {c.vitals?.pulseBpm ?? '-'} bpm, R: {c.vitals?.respirationRate ?? '-'} rpm, BP: {c.vitals?.bpSystolic ?? '-'} / {c.vitals?.bpDiastolic ?? '-'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks */}
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Care Tasks</h2>
          </div>
          <div className="divide-y">
            {tasks.map((t) => (
              <div key={t.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{t.title}</p>
                  <p className="text-sm text-gray-600">Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '-'}</p>
                </div>
                <span className={`px-3 py-1 text-xs rounded-full ${t.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{t.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDetailPage;
