import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, FlaskConical, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "https://h4h2026-production.up.railway.app";

interface RealPatient {
  id: string;
  diagnosis: 0 | 1;
  age: number;
  sex: string;
  heart_rate: number;
  bp_systolic: number;
  bp_diastolic: number;
  wbc: number;
  platelets: number;
  symptoms: string[];
}

interface PatientResult extends RealPatient {
  score: number;
  correct: boolean;
}

const POSITIVE_PATIENTS: RealPatient[] = [
  { id: "LP_0005", diagnosis: 1, age: 17, sex: "M", heart_rate: 76, bp_systolic: 120, bp_diastolic: 80, wbc: 9070, platelets: 179000, symptoms: ["fever", "muscle_pain", "jaundice", "vomiting", "headache", "chills", "rigors", "nausea", "prostration", "oliguria", "conjunctival_suffusion", "muscle_tenderness"] },
  { id: "LP_0013", diagnosis: 1, age: 19, sex: "M", heart_rate: 76, bp_systolic: 120, bp_diastolic: 80, wbc: 7100, platelets: 139000, symptoms: ["fever", "muscle_pain", "vomiting", "headache", "chills", "rigors", "nausea", "oliguria", "conjunctival_suffusion", "muscle_tenderness"] },
  { id: "LP_0015", diagnosis: 1, age: 37, sex: "M", heart_rate: 60, bp_systolic: 110, bp_diastolic: 70, wbc: 6740, platelets: 20000, symptoms: ["muscle_pain", "vomiting", "headache", "chills", "nausea", "diarrhoea", "bleeding", "prostration", "oliguria", "anuria", "muscle_tenderness"] },
  { id: "LP_0023", diagnosis: 1, age: 61, sex: "M", heart_rate: 80, bp_systolic: 140, bp_diastolic: 70, wbc: 9200, platelets: 59000, symptoms: ["fever", "muscle_pain", "vomiting", "headache", "nausea", "oliguria", "conjunctival_suffusion", "muscle_tenderness"] },
  { id: "LP_0040", diagnosis: 1, age: 60, sex: "M", heart_rate: 74, bp_systolic: 90, bp_diastolic: 50, wbc: 15800, platelets: 42000, symptoms: ["fever", "muscle_pain", "jaundice", "confusion", "chills", "conjunctival_suffusion", "muscle_tenderness"] },
  { id: "LP_0046", diagnosis: 1, age: 36, sex: "M", heart_rate: 72, bp_systolic: 110, bp_diastolic: 80, wbc: 4400, platelets: 160000, symptoms: ["fever", "muscle_pain", "headache", "chills", "rigors", "nausea", "cough", "prostration", "oliguria", "conjunctival_suffusion", "muscle_tenderness"] },
  { id: "LP_0050", diagnosis: 1, age: 35, sex: "F", heart_rate: 100, bp_systolic: 110, bp_diastolic: 90, wbc: 2500, platelets: 29000, symptoms: ["vomiting", "nausea", "oliguria"] },
  { id: "LP_0062", diagnosis: 1, age: 43, sex: "M", heart_rate: 80, bp_systolic: 90, bp_diastolic: 60, wbc: 8500, platelets: 18000, symptoms: ["fever", "muscle_pain", "headache", "chills", "rigors", "nausea", "cough", "bleeding", "muscle_tenderness"] },
  { id: "LP_0070", diagnosis: 1, age: 37, sex: "M", heart_rate: 78, bp_systolic: 110, bp_diastolic: 70, wbc: 6910, platelets: 80000, symptoms: ["fever", "muscle_pain", "vomiting", "headache", "chills", "rigors", "nausea", "cough", "bleeding", "anuria", "muscle_tenderness"] },
  { id: "LP_0089", diagnosis: 1, age: 29, sex: "M", heart_rate: 78, bp_systolic: 100, bp_diastolic: 60, wbc: 8100, platelets: 59000, symptoms: ["fever", "headache", "chills", "rigors", "cough", "conjunctival_suffusion"] },
  { id: "LP_0091", diagnosis: 1, age: 24, sex: "M", heart_rate: 78, bp_systolic: 100, bp_diastolic: 60, wbc: 5300, platelets: 79000, symptoms: ["fever", "jaundice", "nausea", "prostration"] },
  { id: "LP_0093", diagnosis: 1, age: 37, sex: "M", heart_rate: 72, bp_systolic: 110, bp_diastolic: 70, wbc: 3800, platelets: 107000, symptoms: ["fever", "muscle_pain", "jaundice", "headache", "chills", "rigors", "nausea", "cough", "bleeding", "oliguria", "muscle_tenderness"] },
  { id: "LP_0106", diagnosis: 1, age: 48, sex: "M", heart_rate: 78, bp_systolic: 100, bp_diastolic: 60, wbc: 4600, platelets: 92000, symptoms: ["fever", "muscle_pain", "jaundice", "headache", "chills", "rigors", "prostration", "oliguria", "conjunctival_suffusion", "muscle_tenderness"] },
  { id: "LP_0108", diagnosis: 1, age: 36, sex: "M", heart_rate: 76, bp_systolic: 100, bp_diastolic: 70, wbc: 8700, platelets: 86000, symptoms: ["fever", "muscle_pain", "jaundice", "vomiting", "headache", "chills", "rigors", "nausea", "cough", "conjunctival_suffusion", "muscle_tenderness"] },
  { id: "LP_0121", diagnosis: 1, age: 34, sex: "M", heart_rate: 78, bp_systolic: 110, bp_diastolic: 70, wbc: 6700, platelets: 131000, symptoms: ["fever", "muscle_pain", "jaundice", "headache", "chills", "rigors", "conjunctival_suffusion", "muscle_tenderness"] },
  { id: "LP_0125", diagnosis: 1, age: 37, sex: "M", heart_rate: 74, bp_systolic: 100, bp_diastolic: 60, wbc: 4500, platelets: 18000, symptoms: ["jaundice", "vomiting", "nausea", "cough", "bleeding", "oliguria"] },
  { id: "LP_0130", diagnosis: 1, age: 21, sex: "M", heart_rate: 76, bp_systolic: 110, bp_diastolic: 70, wbc: 15080, platelets: 36000, symptoms: ["fever", "muscle_pain", "jaundice", "vomiting", "headache", "chills", "rigors", "nausea", "cough", "conjunctival_suffusion", "muscle_tenderness"] },
  { id: "LP_0133", diagnosis: 1, age: 60, sex: "F", heart_rate: 78, bp_systolic: 90, bp_diastolic: 60, wbc: 9100, platelets: 79000, symptoms: ["fever", "jaundice", "confusion", "headache", "chills", "rigors", "nausea", "diarrhoea", "prostration"] },
  { id: "LP_0134", diagnosis: 1, age: 58, sex: "F", heart_rate: 70, bp_systolic: 100, bp_diastolic: 60, wbc: 6540, platelets: 80000, symptoms: ["fever", "muscle_pain", "vomiting", "headache", "chills", "rigors", "nausea", "cough", "oliguria", "conjunctival_suffusion", "muscle_tenderness"] },
  { id: "LP_0139", diagnosis: 1, age: 46, sex: "M", heart_rate: 78, bp_systolic: 110, bp_diastolic: 70, wbc: 5100, platelets: 16000, symptoms: ["fever", "muscle_pain", "headache", "chills", "rigors", "nausea", "prostration", "conjunctival_suffusion", "muscle_tenderness"] },
  { id: "LP_0140", diagnosis: 1, age: 40, sex: "M", heart_rate: 72, bp_systolic: 120, bp_diastolic: 70, wbc: 2900, platelets: 49000, symptoms: ["fever", "muscle_pain", "jaundice", "vomiting", "chills", "rigors", "nausea", "diarrhoea", "prostration", "muscle_tenderness"] },
  { id: "LP_0148", diagnosis: 1, age: 42, sex: "M", heart_rate: 88, bp_systolic: 120, bp_diastolic: 80, wbc: 7200, platelets: 152000, symptoms: ["fever", "muscle_pain", "jaundice", "headache", "chills", "rigors", "nausea", "diarrhoea", "cough", "oliguria", "muscle_tenderness"] },
  { id: "LP_0149", diagnosis: 1, age: 48, sex: "M", heart_rate: 84, bp_systolic: 160, bp_diastolic: 90, wbc: 17600, platelets: 119000, symptoms: ["fever", "muscle_pain", "vomiting", "headache", "chills", "rigors", "nausea", "bleeding", "oliguria", "muscle_tenderness"] },
  { id: "LP_0150", diagnosis: 1, age: 49, sex: "M", heart_rate: 80, bp_systolic: 80, bp_diastolic: 40, wbc: 6100, platelets: 13000, symptoms: ["fever", "muscle_pain", "jaundice", "confusion", "headache", "chills", "rigors", "muscle_tenderness"] },
  { id: "LP_0155", diagnosis: 1, age: 63, sex: "M", heart_rate: 100, bp_systolic: 113, bp_diastolic: 69, wbc: 9900, platelets: 15000, symptoms: ["fever", "jaundice", "chills", "rigors", "nausea", "cough"] },
  { id: "LP_0185", diagnosis: 1, age: 30, sex: "M", heart_rate: 134, bp_systolic: 100, bp_diastolic: 70, wbc: 10200, platelets: 15000, symptoms: ["fever", "muscle_pain", "jaundice", "vomiting", "headache", "nausea", "diarrhoea", "cough", "bleeding", "prostration", "anuria", "conjunctival_suffusion", "muscle_tenderness"] },
  { id: "LP_0188", diagnosis: 1, age: 45, sex: "M", heart_rate: 68, bp_systolic: 120, bp_diastolic: 80, wbc: 8860, platelets: 265000, symptoms: ["fever", "muscle_pain", "vomiting", "headache", "diarrhoea", "cough", "bleeding", "oliguria", "muscle_tenderness"] },
  { id: "LP_0191", diagnosis: 1, age: 38, sex: "M", heart_rate: 96, bp_systolic: 120, bp_diastolic: 80, wbc: 13900, platelets: 11000, symptoms: ["fever", "muscle_pain", "jaundice", "headache", "chills", "diarrhoea", "cough", "bleeding", "prostration", "anuria", "muscle_tenderness"] },
  { id: "LP_0201", diagnosis: 1, age: 43, sex: "M", heart_rate: 124, bp_systolic: 100, bp_diastolic: 60, wbc: 11980, platelets: 10000, symptoms: ["muscle_pain", "bleeding"] },
  { id: "LP_0207", diagnosis: 1, age: 38, sex: "M", heart_rate: 80, bp_systolic: 100, bp_diastolic: 70, wbc: 5530, platelets: 76000, symptoms: ["fever", "muscle_pain", "vomiting", "headache", "chills", "nausea", "cough", "bleeding"] },
  { id: "LP_0224", diagnosis: 1, age: 36, sex: "M", heart_rate: 80, bp_systolic: 100, bp_diastolic: 70, wbc: 4500, platelets: 78000, symptoms: ["fever", "muscle_pain", "jaundice", "headache", "chills", "rigors", "nausea", "cough", "conjunctival_suffusion", "muscle_tenderness"] },
  { id: "LP_0229", diagnosis: 1, age: 19, sex: "M", heart_rate: 80, bp_systolic: 110, bp_diastolic: 80, wbc: 6540, platelets: 77000, symptoms: ["fever", "muscle_pain", "jaundice", "vomiting", "headache", "chills", "nausea", "muscle_tenderness"] },
  { id: "LP_0230", diagnosis: 1, age: 34, sex: "M", heart_rate: 104, bp_systolic: 210, bp_diastolic: 160, wbc: 12260, platelets: 78000, symptoms: ["fever", "muscle_pain", "jaundice", "headache", "nausea", "cough", "prostration", "conjunctival_suffusion", "muscle_tenderness"] },
  { id: "LP_0233", diagnosis: 1, age: 26, sex: "M", heart_rate: 90, bp_systolic: 130, bp_diastolic: 80, wbc: 6000, platelets: 189000, symptoms: ["fever", "muscle_pain", "jaundice", "nausea", "diarrhoea", "oliguria"] },
  { id: "LP_0235", diagnosis: 1, age: 48, sex: "M", heart_rate: 80, bp_systolic: 120, bp_diastolic: 80, wbc: 13800, platelets: 139000, symptoms: ["fever", "jaundice", "vomiting", "headache", "chills", "diarrhoea", "cough", "bleeding"] },
  { id: "LP_0241", diagnosis: 1, age: 61, sex: "M", heart_rate: 98, bp_systolic: 114, bp_diastolic: 62, wbc: 12120, platelets: 12000, symptoms: ["muscle_pain", "nausea", "cough", "prostration", "anuria", "muscle_tenderness"] },
  { id: "LP_0243", diagnosis: 1, age: 30, sex: "M", heart_rate: 66, bp_systolic: 120, bp_diastolic: 80, wbc: 4950, platelets: 94000, symptoms: ["fever", "muscle_pain", "vomiting", "headache", "chills", "rigors", "nausea", "diarrhoea", "cough", "bleeding", "prostration", "conjunctival_suffusion", "muscle_tenderness"] },
  { id: "LP_0263", diagnosis: 1, age: 64, sex: "M", heart_rate: 78, bp_systolic: 110, bp_diastolic: 70, wbc: 4700, platelets: 25000, symptoms: ["fever", "muscle_pain", "headache", "chills", "rigors", "cough", "conjunctival_suffusion", "muscle_tenderness"] },
  { id: "LP_0264", diagnosis: 1, age: 29, sex: "M", heart_rate: 76, bp_systolic: 100, bp_diastolic: 60, wbc: 15850, platelets: 20000, symptoms: ["fever", "muscle_pain", "jaundice", "headache", "chills", "rigors", "diarrhoea", "cough", "conjunctival_suffusion", "muscle_tenderness"] },
  { id: "LP_0265", diagnosis: 1, age: 41, sex: "M", heart_rate: 70, bp_systolic: 120, bp_diastolic: 70, wbc: 11500, platelets: 56000, symptoms: ["fever", "muscle_pain", "jaundice", "headache", "cough", "bleeding", "muscle_tenderness"] },
  { id: "LP_0275", diagnosis: 1, age: 29, sex: "M", heart_rate: 68, bp_systolic: 104, bp_diastolic: 63, wbc: 6680, platelets: 38000, symptoms: ["fever", "muscle_pain", "jaundice", "headache", "chills", "rigors", "bleeding", "anuria", "muscle_tenderness"] },
  { id: "LP_0276", diagnosis: 1, age: 35, sex: "M", heart_rate: 80, bp_systolic: 136, bp_diastolic: 85, wbc: 4890, platelets: 54000, symptoms: ["fever", "muscle_pain", "jaundice", "vomiting", "headache", "chills", "rigors", "diarrhoea", "cough", "muscle_tenderness"] },
  { id: "LP_0291", diagnosis: 1, age: 49, sex: "M", heart_rate: 78, bp_systolic: 120, bp_diastolic: 80, wbc: 5480, platelets: 43000, symptoms: ["muscle_pain", "jaundice", "cough", "muscle_tenderness"] },
  { id: "LP_0294", diagnosis: 1, age: 27, sex: "M", heart_rate: 96, bp_systolic: 100, bp_diastolic: 50, wbc: 10080, platelets: 11000, symptoms: ["fever", "muscle_pain", "jaundice", "vomiting", "headache", "chills", "rigors", "nausea", "diarrhoea", "prostration", "muscle_tenderness"] },
  { id: "LP_0296", diagnosis: 1, age: 53, sex: "M", heart_rate: 80, bp_systolic: 120, bp_diastolic: 80, wbc: 4300, platelets: 31000, symptoms: ["fever", "muscle_pain", "jaundice", "vomiting", "nausea", "cough", "bleeding", "prostration", "anuria", "muscle_tenderness"] },
  { id: "LP_0297", diagnosis: 1, age: 31, sex: "M", heart_rate: 72, bp_systolic: 120, bp_diastolic: 80, wbc: 9890, platelets: 141000, symptoms: ["fever", "muscle_pain", "jaundice", "vomiting", "headache", "chills", "rigors", "diarrhoea", "bleeding", "prostration", "muscle_tenderness"] },
  { id: "LP_0298", diagnosis: 1, age: 47, sex: "M", heart_rate: 80, bp_systolic: 130, bp_diastolic: 80, wbc: 10740, platelets: 58000, symptoms: ["fever", "muscle_pain", "headache", "chills", "prostration", "conjunctival_suffusion", "muscle_tenderness"] },
  { id: "LP_0310", diagnosis: 1, age: 49, sex: "M", heart_rate: 84, bp_systolic: 110, bp_diastolic: 80, wbc: 4700, platelets: 6000, symptoms: ["fever", "muscle_pain", "jaundice", "headache", "chills", "prostration", "muscle_tenderness"] },
  { id: "LP_0341", diagnosis: 1, age: 35, sex: "M", heart_rate: 80, bp_systolic: 120, bp_diastolic: 80, wbc: 10350, platelets: 165000, symptoms: ["fever", "muscle_pain", "jaundice", "confusion", "headache", "chills", "rigors", "nausea", "diarrhoea", "prostration", "conjunctival_suffusion", "muscle_tenderness"] },
  { id: "LP_0347", diagnosis: 1, age: 40, sex: "M", heart_rate: 78, bp_systolic: 90, bp_diastolic: 50, wbc: 6910, platelets: 62000, symptoms: ["fever", "muscle_pain", "jaundice", "headache", "chills", "rigors", "cough", "prostration", "conjunctival_suffusion", "muscle_tenderness"] },
  { id: "LP_0350", diagnosis: 1, age: 35, sex: "M", heart_rate: 72, bp_systolic: 118, bp_diastolic: 68, wbc: 12880, platelets: 99000, symptoms: ["fever", "muscle_pain", "jaundice", "headache", "chills", "rigors", "nausea", "cough", "bleeding", "prostration", "anuria", "conjunctival_suffusion", "muscle_tenderness"] },
  { id: "LP_0351", diagnosis: 1, age: 45, sex: "M", heart_rate: 78, bp_systolic: 132, bp_diastolic: 84, wbc: 11010, platelets: 122000, symptoms: ["fever", "muscle_pain", "jaundice", "confusion", "headache", "chills", "rigors", "prostration", "conjunctival_suffusion", "muscle_tenderness"] },
  { id: "LP_0355", diagnosis: 1, age: 60, sex: "M", heart_rate: 90, bp_systolic: 70, bp_diastolic: 40, wbc: 5880, platelets: 5000, symptoms: ["fever", "muscle_pain", "jaundice", "vomiting", "headache", "chills", "rigors", "nausea", "bleeding", "prostration", "conjunctival_suffusion", "muscle_tenderness"] },
  { id: "LP_0357", diagnosis: 1, age: 27, sex: "M", heart_rate: 78, bp_systolic: 110, bp_diastolic: 60, wbc: 3780, platelets: 14000, symptoms: ["fever", "muscle_pain", "vomiting", "headache", "chills", "nausea", "cough", "conjunctival_suffusion", "muscle_tenderness"] },
  { id: "LP_0360", diagnosis: 1, age: 35, sex: "M", heart_rate: 72, bp_systolic: 120, bp_diastolic: 80, wbc: 3600, platelets: 92000, symptoms: ["fever", "muscle_pain", "jaundice", "vomiting", "headache", "chills", "nausea", "cough", "bleeding", "muscle_tenderness"] },
  { id: "LP_0361", diagnosis: 1, age: 17, sex: "M", heart_rate: 78, bp_systolic: 110, bp_diastolic: 80, wbc: 7000, platelets: 91000, symptoms: ["fever", "muscle_pain", "jaundice", "headache", "chills", "rigors", "nausea", "cough", "prostration", "oliguria", "muscle_tenderness"] },
  { id: "LP_0400", diagnosis: 1, age: 49, sex: "M", heart_rate: 68, bp_systolic: 60, bp_diastolic: 40, wbc: 17310, platelets: 400000, symptoms: ["fever", "muscle_pain", "jaundice", "oliguria", "muscle_tenderness"] },
];

const NEGATIVE_PATIENTS: RealPatient[] = [
  { id: "LP_0007", diagnosis: 0, age: 33, sex: "M", heart_rate: 74, bp_systolic: 110, bp_diastolic: 80, wbc: 5100, platelets: 120000, symptoms: ["fever", "muscle_pain", "headache", "chills", "rigors", "muscle_tenderness"] },
  { id: "LP_0011", diagnosis: 0, age: 28, sex: "M", heart_rate: 120, bp_systolic: 130, bp_diastolic: 80, wbc: 3000, platelets: 123000, symptoms: ["fever", "vomiting", "headache", "chills", "rigors", "nausea", "muscle_tenderness"] },
  { id: "LP_0020", diagnosis: 0, age: 57, sex: "M", heart_rate: 72, bp_systolic: 100, bp_diastolic: 70, wbc: 8000, platelets: 133000, symptoms: ["fever", "muscle_pain", "vomiting", "headache", "nausea", "diarrhoea", "muscle_tenderness"] },
  { id: "LP_0021", diagnosis: 0, age: 45, sex: "M", heart_rate: 78, bp_systolic: 100, bp_diastolic: 60, wbc: 6500, platelets: 189000, symptoms: ["fever", "muscle_pain", "vomiting", "headache", "chills", "nausea", "cough", "muscle_tenderness"] },
  { id: "LP_0022", diagnosis: 0, age: 36, sex: "M", heart_rate: 76, bp_systolic: 100, bp_diastolic: 70, wbc: 2600, platelets: 122000, symptoms: ["fever", "vomiting", "headache", "chills", "rigors", "nausea", "muscle_tenderness"] },
  { id: "LP_0024", diagnosis: 0, age: 57, sex: "M", heart_rate: 80, bp_systolic: 140, bp_diastolic: 90, wbc: 14900, platelets: 253000, symptoms: ["fever", "muscle_pain", "vomiting", "headache", "nausea", "muscle_tenderness"] },
  { id: "LP_0026", diagnosis: 0, age: 40, sex: "M", heart_rate: 76, bp_systolic: 130, bp_diastolic: 80, wbc: 10800, platelets: 196000, symptoms: ["fever", "muscle_pain", "headache", "chills", "nausea", "prostration", "muscle_tenderness"] },
  { id: "LP_0035", diagnosis: 0, age: 29, sex: "M", heart_rate: 76, bp_systolic: 110, bp_diastolic: 70, wbc: 6000, platelets: 289000, symptoms: ["fever", "prostration"] },
  { id: "LP_0048", diagnosis: 0, age: 38, sex: "M", heart_rate: 84, bp_systolic: 110, bp_diastolic: 70, wbc: 3089, platelets: 324000, symptoms: ["fever", "muscle_pain", "headache", "chills", "rigors", "muscle_tenderness"] },
  { id: "LP_0075", diagnosis: 0, age: 44, sex: "M", heart_rate: 78, bp_systolic: 110, bp_diastolic: 70, wbc: 4200, platelets: 171000, symptoms: ["fever", "muscle_pain", "headache", "chills", "rigors", "muscle_tenderness"] },
  { id: "LP_0095", diagnosis: 0, age: 63, sex: "M", heart_rate: 80, bp_systolic: 100, bp_diastolic: 60, wbc: 4600, platelets: 126000, symptoms: ["fever", "muscle_pain", "headache", "chills", "prostration", "muscle_tenderness"] },
  { id: "LP_0102", diagnosis: 0, age: 45, sex: "M", heart_rate: 76, bp_systolic: 130, bp_diastolic: 80, wbc: 5000, platelets: 142000, symptoms: ["fever", "muscle_pain", "headache", "rigors", "muscle_tenderness"] },
  { id: "LP_0103", diagnosis: 0, age: 48, sex: "M", heart_rate: 72, bp_systolic: 110, bp_diastolic: 70, wbc: 11200, platelets: 259000, symptoms: ["fever", "muscle_pain", "headache", "chills", "rigors", "muscle_tenderness"] },
  { id: "LP_0136", diagnosis: 0, age: 57, sex: "M", heart_rate: 76, bp_systolic: 110, bp_diastolic: 70, wbc: 15800, platelets: 129000, symptoms: ["fever", "muscle_pain", "headache", "chills", "rigors", "cough", "prostration", "muscle_tenderness"] },
  { id: "LP_0137", diagnosis: 0, age: 62, sex: "M", heart_rate: 80, bp_systolic: 110, bp_diastolic: 70, wbc: 10200, platelets: 125000, symptoms: ["fever", "muscle_pain", "headache", "chills", "rigors", "nausea", "cough", "prostration", "muscle_tenderness"] },
  { id: "LP_0154", diagnosis: 0, age: 53, sex: "M", heart_rate: 72, bp_systolic: 100, bp_diastolic: 60, wbc: 6800, platelets: 221000, symptoms: ["muscle_pain", "nausea", "muscle_tenderness"] },
  { id: "LP_0161", diagnosis: 0, age: 43, sex: "M", heart_rate: 80, bp_systolic: 130, bp_diastolic: 90, wbc: 6200, platelets: 184000, symptoms: ["fever", "headache", "chills", "rigors", "prostration"] },
  { id: "LP_0172", diagnosis: 0, age: 46, sex: "M", heart_rate: 80, bp_systolic: 110, bp_diastolic: 70, wbc: 7460, platelets: 152000, symptoms: ["fever", "headache"] },
  { id: "LP_0175", diagnosis: 0, age: 40, sex: "F", heart_rate: 76, bp_systolic: 120, bp_diastolic: 80, wbc: 23300, platelets: 314000, symptoms: ["fever", "vomiting", "chills"] },
  { id: "LP_0177", diagnosis: 0, age: 25, sex: "M", heart_rate: 72, bp_systolic: 120, bp_diastolic: 80, wbc: 5500, platelets: 171000, symptoms: ["cough", "prostration"] },
  { id: "LP_0184", diagnosis: 0, age: 23, sex: "M", heart_rate: 84, bp_systolic: 100, bp_diastolic: 60, wbc: 7500, platelets: 140000, symptoms: ["fever", "muscle_pain", "chills", "cough", "muscle_tenderness"] },
  { id: "LP_0190", diagnosis: 0, age: 33, sex: "F", heart_rate: 80, bp_systolic: 120, bp_diastolic: 80, wbc: 16610, platelets: 386000, symptoms: ["fever", "headache", "nausea", "cough"] },
  { id: "LP_0195", diagnosis: 0, age: 14, sex: "M", heart_rate: 100, bp_systolic: 110, bp_diastolic: 80, wbc: 20000, platelets: 419000, symptoms: ["muscle_pain", "headache", "prostration", "muscle_tenderness"] },
  { id: "LP_0198", diagnosis: 0, age: 23, sex: "M", heart_rate: 78, bp_systolic: 120, bp_diastolic: 80, wbc: 9060, platelets: 380000, symptoms: ["muscle_pain", "headache", "cough"] },
  { id: "LP_0204", diagnosis: 0, age: 54, sex: "F", heart_rate: 76, bp_systolic: 110, bp_diastolic: 70, wbc: 30490, platelets: 730000, symptoms: ["vomiting", "prostration"] },
  { id: "LP_0206", diagnosis: 0, age: 18, sex: "F", heart_rate: 80, bp_systolic: 110, bp_diastolic: 70, wbc: 10100, platelets: 158000, symptoms: ["fever", "headache", "chills", "prostration"] },
  { id: "LP_0213", diagnosis: 0, age: 27, sex: "F", heart_rate: 98, bp_systolic: 100, bp_diastolic: 70, wbc: 10400, platelets: 288000, symptoms: ["headache"] },
  { id: "LP_0216", diagnosis: 0, age: 67, sex: "M", heart_rate: 72, bp_systolic: 100, bp_diastolic: 60, wbc: 18930, platelets: 164000, symptoms: ["fever", "muscle_pain", "vomiting", "headache", "chills", "rigors", "nausea", "cough", "muscle_tenderness"] },
  { id: "LP_0220", diagnosis: 0, age: 45, sex: "M", heart_rate: 80, bp_systolic: 95, bp_diastolic: 60, wbc: 6320, platelets: 128000, symptoms: ["fever", "muscle_pain", "headache", "chills", "nausea", "cough", "muscle_tenderness"] },
  { id: "LP_0221", diagnosis: 0, age: 22, sex: "F", heart_rate: 84, bp_systolic: 120, bp_diastolic: 80, wbc: 2940, platelets: 211000, symptoms: ["fever", "vomiting", "headache", "chills", "nausea", "prostration"] },
  { id: "LP_0249", diagnosis: 0, age: 35, sex: "F", heart_rate: 76, bp_systolic: 110, bp_diastolic: 70, wbc: 9310, platelets: 256000, symptoms: ["muscle_pain", "headache", "nausea", "prostration", "muscle_tenderness"] },
  { id: "LP_0259", diagnosis: 0, age: 48, sex: "M", heart_rate: 68, bp_systolic: 100, bp_diastolic: 60, wbc: 6930, platelets: 166000, symptoms: ["fever", "muscle_pain", "headache", "chills", "diarrhoea", "prostration", "muscle_tenderness"] },
  { id: "LP_0301", diagnosis: 0, age: 36, sex: "M", heart_rate: 72, bp_systolic: 120, bp_diastolic: 80, wbc: 5630, platelets: 141000, symptoms: ["fever", "muscle_pain", "vomiting", "headache", "chills", "nausea", "cough", "muscle_tenderness"] },
  { id: "LP_0302", diagnosis: 0, age: 47, sex: "M", heart_rate: 90, bp_systolic: 114, bp_diastolic: 68, wbc: 10200, platelets: 138000, symptoms: ["fever", "muscle_pain", "vomiting", "headache", "chills", "muscle_tenderness"] },
  { id: "LP_0305", diagnosis: 0, age: 59, sex: "M", heart_rate: 74, bp_systolic: 120, bp_diastolic: 80, wbc: 8900, platelets: 243000, symptoms: ["fever", "muscle_pain", "confusion", "headache", "chills", "rigors", "nausea", "diarrhoea", "cough", "prostration", "muscle_tenderness"] },
  { id: "LP_0323", diagnosis: 0, age: 54, sex: "M", heart_rate: 78, bp_systolic: 110, bp_diastolic: 80, wbc: 6800, platelets: 179000, symptoms: ["fever", "muscle_pain", "confusion", "headache", "chills", "rigors", "nausea", "cough", "muscle_tenderness"] },
  { id: "LP_0324", diagnosis: 0, age: 20, sex: "M", heart_rate: 96, bp_systolic: 100, bp_diastolic: 60, wbc: 11300, platelets: 231000, symptoms: ["fever", "headache", "chills", "cough", "prostration"] },
  { id: "LP_0325", diagnosis: 0, age: 29, sex: "M", heart_rate: 78, bp_systolic: 120, bp_diastolic: 80, wbc: 10700, platelets: 143000, symptoms: ["headache"] },
  { id: "LP_0326", diagnosis: 0, age: 45, sex: "F", heart_rate: 72, bp_systolic: 120, bp_diastolic: 80, wbc: 4790, platelets: 204000, symptoms: ["fever", "muscle_pain", "vomiting", "headache", "chills", "nausea", "cough", "muscle_tenderness"] },
  { id: "LP_0333", diagnosis: 0, age: 50, sex: "M", heart_rate: 72, bp_systolic: 120, bp_diastolic: 80, wbc: 5580, platelets: 175000, symptoms: ["fever", "muscle_pain", "headache", "chills", "rigors", "diarrhoea", "cough", "muscle_tenderness"] },
  { id: "LP_0334", diagnosis: 0, age: 57, sex: "M", heart_rate: 78, bp_systolic: 110, bp_diastolic: 80, wbc: 11270, platelets: 420000, symptoms: ["fever", "muscle_pain", "headache", "chills", "cough", "muscle_tenderness"] },
  { id: "LP_0343", diagnosis: 0, age: 47, sex: "M", heart_rate: 100, bp_systolic: 90, bp_diastolic: 60, wbc: 9170, platelets: 175000, symptoms: ["fever", "muscle_pain", "headache", "chills", "nausea", "cough", "muscle_tenderness"] },
  { id: "LP_0346", diagnosis: 0, age: 67, sex: "M", heart_rate: 74, bp_systolic: 126, bp_diastolic: 78, wbc: 9300, platelets: 161000, symptoms: ["fever", "muscle_pain", "chills", "nausea", "diarrhoea", "cough", "muscle_tenderness"] },
  { id: "LP_0354", diagnosis: 0, age: 60, sex: "M", heart_rate: 78, bp_systolic: 120, bp_diastolic: 80, wbc: 7210, platelets: 183000, symptoms: ["fever", "headache"] },
  { id: "LP_0365", diagnosis: 0, age: 64, sex: "F", heart_rate: 84, bp_systolic: 140, bp_diastolic: 80, wbc: 11940, platelets: 137000, symptoms: ["fever", "chills", "diarrhoea", "cough"] },
  { id: "LP_0368", diagnosis: 0, age: 32, sex: "M", heart_rate: 68, bp_systolic: 110, bp_diastolic: 70, wbc: 4000, platelets: 720000, symptoms: ["muscle_pain", "prostration", "muscle_tenderness"] },
  { id: "LP_0371", diagnosis: 0, age: 56, sex: "M", heart_rate: 120, bp_systolic: 130, bp_diastolic: 90, wbc: 9000, platelets: 128000, symptoms: ["fever", "muscle_pain", "headache", "chills", "rigors", "muscle_tenderness"] },
  { id: "LP_0382", diagnosis: 0, age: 72, sex: "F", heart_rate: 80, bp_systolic: 80, bp_diastolic: 60, wbc: 3480, platelets: 670000, symptoms: ["fever", "muscle_pain", "headache", "chills", "rigors", "nausea", "prostration", "muscle_tenderness"] },
  { id: "LP_0383", diagnosis: 0, age: 52, sex: "M", heart_rate: 100, bp_systolic: 140, bp_diastolic: 80, wbc: 7830, platelets: 127000, symptoms: ["fever", "muscle_pain", "vomiting", "headache", "nausea", "muscle_tenderness"] },
  { id: "LP_0392", diagnosis: 0, age: 49, sex: "M", heart_rate: 70, bp_systolic: 100, bp_diastolic: 70, wbc: 3600, platelets: 620000, symptoms: ["fever", "headache", "nausea"] },
  { id: "LP_0399", diagnosis: 0, age: 85, sex: "F", heart_rate: 80, bp_systolic: 100, bp_diastolic: 60, wbc: 14970, platelets: 160000, symptoms: ["fever", "headache", "chills", "rigors", "prostration"] },
  { id: "LP_0404", diagnosis: 0, age: 63, sex: "M", heart_rate: 80, bp_systolic: 90, bp_diastolic: 60, wbc: 11560, platelets: 319000, symptoms: ["fever", "muscle_pain", "headache", "chills", "nausea", "prostration"] },
  { id: "LP_0419", diagnosis: 0, age: 36, sex: "M", heart_rate: 79, bp_systolic: 100, bp_diastolic: 70, wbc: 3100, platelets: 141000, symptoms: ["fever", "headache", "chills", "prostration"] },
  { id: "LP_0422", diagnosis: 0, age: 55, sex: "F", heart_rate: 72, bp_systolic: 110, bp_diastolic: 70, wbc: 11720, platelets: 242000, symptoms: ["fever", "headache", "chills", "nausea", "cough"] },
  { id: "LP_0426", diagnosis: 0, age: 55, sex: "F", heart_rate: 84, bp_systolic: 120, bp_diastolic: 80, wbc: 2320, platelets: 560000, symptoms: ["fever", "muscle_pain", "vomiting", "chills", "prostration", "muscle_tenderness"] },
  { id: "LP_0430", diagnosis: 0, age: 36, sex: "M", heart_rate: 90, bp_systolic: 100, bp_diastolic: 80, wbc: 8710, platelets: 160000, symptoms: ["fever", "headache", "chills"] },
  { id: "LP_0433", diagnosis: 0, age: 29, sex: "M", heart_rate: 88, bp_systolic: 120, bp_diastolic: 80, wbc: 6630, platelets: 262000, symptoms: ["fever", "muscle_pain", "headache", "chills", "rigors", "nausea", "diarrhoea"] },
  { id: "LP_0435", diagnosis: 0, age: 35, sex: "F", heart_rate: 80, bp_systolic: 120, bp_diastolic: 80, wbc: 7690, platelets: 231000, symptoms: ["headache", "diarrhoea", "prostration"] },
  { id: "LP_0438", diagnosis: 0, age: 79, sex: "M", heart_rate: 68, bp_systolic: 130, bp_diastolic: 80, wbc: 6700, platelets: 630000, symptoms: ["fever", "headache", "chills"] },
  { id: "LP_0439", diagnosis: 0, age: 68, sex: "F", heart_rate: 100, bp_systolic: 110, bp_diastolic: 70, wbc: 6220, platelets: 200000, symptoms: ["muscle_pain", "confusion", "headache"] },
  { id: "LP_0442", diagnosis: 0, age: 57, sex: "M", heart_rate: 88, bp_systolic: 100, bp_diastolic: 60, wbc: 2830, platelets: 780000, symptoms: ["fever", "muscle_pain", "headache", "chills", "rigors", "muscle_tenderness"] },
  { id: "LP_0443", diagnosis: 0, age: 50, sex: "F", heart_rate: 76, bp_systolic: 120, bp_diastolic: 80, wbc: 6470, platelets: 124000, symptoms: ["fever", "muscle_pain", "headache", "chills", "nausea"] },
  { id: "LP_0444", diagnosis: 0, age: 46, sex: "M", heart_rate: 84, bp_systolic: 100, bp_diastolic: 65, wbc: 6580, platelets: 126000, symptoms: ["fever", "muscle_pain", "headache", "nausea", "muscle_tenderness"] },
  { id: "LP_0447", diagnosis: 0, age: 45, sex: "M", heart_rate: 90, bp_systolic: 110, bp_diastolic: 70, wbc: 8630, platelets: 318000, symptoms: ["fever", "muscle_pain", "headache", "chills", "muscle_tenderness"] },
  { id: "LP_0449", diagnosis: 0, age: 34, sex: "M", heart_rate: 84, bp_systolic: 100, bp_diastolic: 70, wbc: 3300, platelets: 161000, symptoms: ["fever", "prostration"] },
  { id: "LP_0451", diagnosis: 0, age: 41, sex: "M", heart_rate: 80, bp_systolic: 120, bp_diastolic: 90, wbc: 3910, platelets: 141000, symptoms: ["fever", "muscle_pain", "vomiting", "headache", "chills", "prostration"] },
  { id: "LP_0452", diagnosis: 0, age: 48, sex: "F", heart_rate: 78, bp_systolic: 120, bp_diastolic: 80, wbc: 10090, platelets: 216000, symptoms: ["fever", "muscle_pain", "headache", "chills", "rigors"] },
  { id: "LP_0453", diagnosis: 0, age: 48, sex: "F", heart_rate: 88, bp_systolic: 100, bp_diastolic: 60, wbc: 7260, platelets: 167000, symptoms: ["fever", "muscle_pain", "headache", "chills", "prostration"] },
  { id: "LP_0454", diagnosis: 0, age: 48, sex: "M", heart_rate: 96, bp_systolic: 110, bp_diastolic: 70, wbc: 6520, platelets: 790000, symptoms: ["fever", "muscle_pain", "headache", "chills", "rigors"] },
  { id: "LP_0457", diagnosis: 0, age: 55, sex: "M", heart_rate: 72, bp_systolic: 110, bp_diastolic: 80, wbc: 17810, platelets: 184000, symptoms: ["fever", "muscle_pain", "chills", "rigors", "prostration"] },
  { id: "LP_0459", diagnosis: 0, age: 49, sex: "M", heart_rate: 92, bp_systolic: 160, bp_diastolic: 100, wbc: 11120, platelets: 280000, symptoms: ["headache"] },
  { id: "LP_0461", diagnosis: 0, age: 35, sex: "M", heart_rate: 78, bp_systolic: 100, bp_diastolic: 70, wbc: 3980, platelets: 158000, symptoms: ["fever", "muscle_pain", "vomiting", "headache", "chills", "rigors"] },
  { id: "LP_0462", diagnosis: 0, age: 62, sex: "M", heart_rate: 70, bp_systolic: 110, bp_diastolic: 70, wbc: 5190, platelets: 320000, symptoms: ["fever", "muscle_pain", "headache", "chills", "prostration"] },
  { id: "LP_0463", diagnosis: 0, age: 21, sex: "M", heart_rate: 72, bp_systolic: 100, bp_diastolic: 70, wbc: 24790, platelets: 272000, symptoms: ["fever", "muscle_pain", "vomiting", "headache", "chills"] },
  { id: "LP_0470", diagnosis: 0, age: 44, sex: "M", heart_rate: 80, bp_systolic: 110, bp_diastolic: 70, wbc: 11140, platelets: 185000, symptoms: ["fever", "muscle_pain", "headache", "chills", "rigors", "nausea"] },
  { id: "LP_0473", diagnosis: 0, age: 24, sex: "M", heart_rate: 82, bp_systolic: 120, bp_diastolic: 70, wbc: 8260, platelets: 181000, symptoms: ["fever", "vomiting", "headache", "chills", "nausea"] },
  { id: "LP_0476", diagnosis: 0, age: 62, sex: "M", heart_rate: 70, bp_systolic: 110, bp_diastolic: 70, wbc: 5870, platelets: 135000, symptoms: ["fever", "muscle_pain", "headache"] },
  { id: "LP_0482", diagnosis: 0, age: 31, sex: "M", heart_rate: 72, bp_systolic: 110, bp_diastolic: 60, wbc: 9170, platelets: 159000, symptoms: ["fever", "muscle_pain", "headache", "chills"] },
  { id: "LP_0483", diagnosis: 0, age: 38, sex: "M", heart_rate: 78, bp_systolic: 100, bp_diastolic: 50, wbc: 8140, platelets: 134000, symptoms: ["fever", "muscle_pain", "headache", "chills", "rigors"] },
  { id: "LP_0485", diagnosis: 0, age: 22, sex: "M", heart_rate: 96, bp_systolic: 100, bp_diastolic: 70, wbc: 20890, platelets: 283000, symptoms: ["fever", "muscle_pain", "headache", "chills", "rigors", "nausea", "diarrhoea", "muscle_tenderness"] },
  { id: "LP_0487", diagnosis: 0, age: 60, sex: "M", heart_rate: 94, bp_systolic: 130, bp_diastolic: 80, wbc: 7810, platelets: 292000, symptoms: ["fever", "muscle_pain", "headache", "chills", "rigors", "prostration", "muscle_tenderness"] },
  { id: "LP_0489", diagnosis: 0, age: 41, sex: "M", heart_rate: 78, bp_systolic: 120, bp_diastolic: 80, wbc: 1790, platelets: 154000, symptoms: ["fever", "vomiting", "headache", "chills", "rigors"] },
  { id: "LP_0491", diagnosis: 0, age: 37, sex: "M", heart_rate: 60, bp_systolic: 110, bp_diastolic: 60, wbc: 8900, platelets: 132000, symptoms: ["muscle_pain", "headache", "nausea"] },
  { id: "LP_0495", diagnosis: 0, age: 41, sex: "M", heart_rate: 76, bp_systolic: 110, bp_diastolic: 70, wbc: 5350, platelets: 198000, symptoms: ["fever", "muscle_pain", "headache", "chills", "rigors"] },
];

const SYMPTOM_LABELS: Record<string, string> = {
  fever: "Fever", muscle_pain: "Muscle Pain", jaundice: "Jaundice",
  vomiting: "Vomiting", confusion: "Confusion", headache: "Headache",
  chills: "Chills", rigors: "Rigors", nausea: "Nausea",
  diarrhoea: "Diarrhoea", cough: "Cough", bleeding: "Bleeding",
  prostration: "Prostration", oliguria: "Oliguria", anuria: "Anuria",
  conjunctival_suffusion: "Conj. Suffusion", muscle_tenderness: "Muscle Tend.",
};

function buildPayload(p: RealPatient) {
  const payload: Record<string, unknown> = {
    heart_rate_bpm: p.heart_rate,
    systolic_bp_mmHg: p.bp_systolic,
    diastolic_bp_mmHg: p.bp_diastolic,
    age_years: p.age,
    sex: p.sex,
    wbc: p.wbc,
    platelets: p.platelets,
  };
  for (const s of p.symptoms) {
    payload[s] = true;
  }
  return payload;
}

function PatientRow({ r, index }: { r: PatientResult; index: number }) {
  const scorePct = Math.round(r.score * 100);
  const isAnomaly = r.score > 0.5;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      style={{
        display: "grid",
        gridTemplateColumns: "80px 70px 60px 1fr 80px 40px",
        gap: 12,
        alignItems: "center",
        padding: "10px 20px",
        background: index % 2 === 0 ? "var(--white)" : "var(--gray-100)",
        borderRadius: 8,
        fontSize: 13,
        fontFamily: "var(--mono)",
      }}
    >
      <span style={{ fontWeight: 700 }}>{r.id}</span>
      <span>
        <span
          style={{
            display: "inline-block",
            padding: "2px 10px",
            borderRadius: 100,
            fontSize: 11,
            fontWeight: 700,
            background: isAnomaly ? "rgba(199, 64, 45, 0.1)" : "rgba(34, 139, 34, 0.1)",
            color: isAnomaly ? "var(--red)" : "#228B22",
          }}
        >
          {scorePct}%
        </span>
      </span>
      <span style={{ fontSize: 11, fontWeight: 600, color: r.diagnosis === 1 ? "var(--red)" : "#228B22" }}>
        {r.diagnosis === 1 ? "POS" : "NEG"}
      </span>
      <span style={{ fontSize: 12, color: "var(--gray-600)", lineHeight: 1.5 }}>
        {r.symptoms.length > 0
          ? r.symptoms.map((s) => SYMPTOM_LABELS[s] || s).join(", ")
          : "No symptoms"}
      </span>
      <span style={{ fontSize: 11, color: "var(--gray-400)" }}>
        PLT {(r.platelets / 1000).toFixed(0)}k
      </span>
      <span>
        {r.correct
          ? <CheckCircle2 size={18} color="#228B22" />
          : <XCircle size={18} color="var(--red)" />}
      </span>
    </motion.div>
  );
}

function ConfusionMatrix({ tp, fn, fp, tn }: { tp: number; fn: number; fp: number; tn: number }) {
  const total = tp + fn + fp + tn;
  const accuracy = total > 0 ? ((tp + tn) / total * 100).toFixed(0) : "0";
  const sensitivity = (tp + fn) > 0 ? (tp / (tp + fn) * 100).toFixed(0) : "0";
  const specificity = (tn + fp) > 0 ? (tn / (tn + fp) * 100).toFixed(0) : "0";

  const cellStyle = (value: number, isCorrect: boolean): React.CSSProperties => ({
    padding: "20px 16px",
    textAlign: "center",
    borderRadius: 8,
    background: isCorrect
      ? value > 0 ? "rgba(34, 139, 34, 0.08)" : "var(--gray-100)"
      : value > 0 ? "rgba(199, 64, 45, 0.08)" : "var(--gray-100)",
    border: `1px solid ${isCorrect
      ? value > 0 ? "rgba(34, 139, 34, 0.2)" : "var(--gray-200)"
      : value > 0 ? "rgba(199, 64, 45, 0.2)" : "var(--gray-200)"}`,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      style={{ marginBottom: 48 }}
    >
      <h3
        style={{
          fontFamily: "var(--serif)",
          fontSize: 22,
          fontWeight: 400,
          marginBottom: 20,
        }}
      >
        Confusion Matrix
      </h3>

      <div style={{ display: "flex", gap: 40, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "120px 120px 120px",
              gridTemplateRows: "40px 120px 120px",
              gap: 4,
            }}
          >
            <div />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 11, color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Pred. Positive
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 11, color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Pred. Negative
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 11, color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.05em", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
              Actual Positive
            </div>
            <div style={cellStyle(tp, true)}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 32, fontStyle: "italic", color: "#228B22" }}>{tp}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--gray-500)", marginTop: 4 }}>True Pos</div>
            </div>
            <div style={cellStyle(fn, false)}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 32, fontStyle: "italic", color: "var(--red)" }}>{fn}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--gray-500)", marginTop: 4 }}>False Neg</div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 11, color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.05em", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
              Actual Negative
            </div>
            <div style={cellStyle(fp, false)}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 32, fontStyle: "italic", color: "var(--red)" }}>{fp}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--gray-500)", marginTop: 4 }}>False Pos</div>
            </div>
            <div style={cellStyle(tn, true)}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 32, fontStyle: "italic", color: "#228B22" }}>{tn}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--gray-500)", marginTop: 4 }}>True Neg</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 180 }}>
          <div style={{ padding: "16px 20px", borderRadius: 8, background: "var(--gray-100)", border: "1px solid var(--gray-200)" }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontStyle: "italic" }}>{accuracy}%</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--gray-500)" }}>Accuracy</div>
          </div>
          <div style={{ padding: "16px 20px", borderRadius: 8, background: "var(--gray-100)", border: "1px solid var(--gray-200)" }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontStyle: "italic" }}>{sensitivity}%</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--gray-500)" }}>Sensitivity</div>
          </div>
          <div style={{ padding: "16px 20px", borderRadius: 8, background: "var(--gray-100)", border: "1px solid var(--gray-200)" }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontStyle: "italic" }}>{specificity}%</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--gray-500)" }}>Specificity</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const SAMPLE_SIZE = 20;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Validation() {
  const [results, setResults] = useState<PatientResult[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const totalDataset = POSITIVE_PATIENTS.length + NEGATIVE_PATIENTS.length;

  const runValidation = async () => {
    setRunning(true);
    setResults([]);
    setProgress(0);

    const allPatients = shuffle([...POSITIVE_PATIENTS, ...NEGATIVE_PATIENTS]);
    const sample = allPatients.slice(0, SAMPLE_SIZE);
    const newResults: PatientResult[] = [];

    for (let i = 0; i < sample.length; i++) {
      const p = sample[i];
      try {
        const res = await fetch(`${API_URL}/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload(p)),
        });
        const data = await res.json();
        const score = data.anomaly_probability as number;
        const predicted = score > 0.5 ? 1 : 0;
        newResults.push({
          ...p,
          score,
          correct: predicted === p.diagnosis,
        });
      } catch {
        newResults.push({ ...p, score: -1, correct: false });
      }
      setProgress(i + 1);
      setResults([...newResults]);
    }

    setRunning(false);
  };

  const correctCount = results.filter((r) => r.correct).length;

  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh" }}>
      <header
        style={{
          borderBottom: "1px solid var(--gray-200)",
          padding: "16px clamp(24px, 4vw, 48px)",
        }}
      >
        <div
          style={{
            maxWidth: 1140,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              fontFamily: "var(--mono)",
              color: "var(--gray-600)",
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={16} /> Back to QuantumDx
          </Link>
          <span
            style={{
              fontFamily: "var(--serif)",
              fontSize: 18,
              fontStyle: "italic",
            }}
          >
            QuantumDx
          </span>
        </div>
      </header>

      <main
        style={{
          maxWidth: 1140,
          margin: "0 auto",
          padding: "60px clamp(24px, 4vw, 48px) 120px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1
            style={{
              fontFamily: "var(--serif)",
              fontSize: "clamp(32px, 5vw, 48px)",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              marginBottom: 16,
            }}
          >
            Model Validation
          </h1>
          <p
            style={{
              fontSize: 16,
              color: "var(--gray-600)",
              maxWidth: 700,
              lineHeight: 1.7,
              marginBottom: 12,
            }}
          >
            Testing the 16-qubit quantum fidelity kernel on a random sample of{" "}
            <strong>20 real leptospirosis patients</strong> from Kisumu County, Kenya.
            Each patient is encoded into a 65,536-dimensional quantum state and
            classified via fidelity clustering against 30 synthetic reference patients.
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 40,
            }}
          >
            {[
              { label: "Qubits", value: "16" },
              { label: "State Dim", value: "65,536" },
              { label: "Training", value: "30 synthetic" },
              { label: "Kernel", value: "Quantum Fidelity" },
              { label: "Dataset", value: `${totalDataset} patients` },
              { label: "Sample", value: `${SAMPLE_SIZE} random` },
              { label: "Data Source", value: "Kisumu County" },
            ].map((s) => (
              <span
                key={s.label}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                  padding: "6px 14px",
                  borderRadius: 6,
                  border: "1px solid var(--gray-200)",
                  background: "var(--gray-100)",
                }}
              >
                <span style={{ color: "var(--gray-400)" }}>{s.label}:</span>{" "}
                <strong>{s.value}</strong>
              </span>
            ))}
          </div>

          <button
            onClick={runValidation}
            disabled={running}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 32px",
              fontSize: 16,
              borderRadius: 8,
              fontWeight: 600,
              fontFamily: "var(--mono)",
              background: running ? "var(--gray-400)" : "var(--red)",
              color: "var(--white)",
              border: "none",
              cursor: running ? "not-allowed" : "pointer",
              transition: "background 0.2s ease",
              marginBottom: 16,
            }}
          >
            {running ? (
              <>
                <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                Running {progress}/{SAMPLE_SIZE}...
              </>
            ) : (
              <>
                <FlaskConical size={18} />
                {results.length > 0 ? "Run Again" : "Run Validation"}
              </>
            )}
          </button>

          {running && (
            <div
              style={{
                height: 4,
                borderRadius: 2,
                background: "var(--gray-200)",
                marginBottom: 40,
                overflow: "hidden",
              }}
            >
              <motion.div
                animate={{ width: `${(progress / SAMPLE_SIZE) * 100}%` }}
                style={{
                  height: "100%",
                  background: "var(--red)",
                  borderRadius: 2,
                }}
              />
            </div>
          )}

          <AnimatePresence>
            {results.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {!running && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{
                      background: "rgba(34, 139, 34, 0.06)",
                      border: "1px solid rgba(34, 139, 34, 0.2)",
                      borderRadius: 12,
                      padding: "24px 32px",
                      marginBottom: 40,
                      display: "flex",
                      justifyContent: "space-around",
                      flexWrap: "wrap",
                      gap: 24,
                      textAlign: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--serif)",
                          fontSize: 36,
                          fontStyle: "italic",
                          color: "#228B22",
                        }}
                      >
                        {correctCount}/{SAMPLE_SIZE}
                      </div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--gray-600)" }}>
                        Sample Correct
                      </div>
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 36, fontStyle: "italic" }}>
                        {Math.round((correctCount / SAMPLE_SIZE) * 100)}%
                      </div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--gray-600)" }}>
                        Sample Accuracy
                      </div>
                    </div>
                  </motion.div>
                )}

                <div style={{ marginBottom: 40 }}>
                  <h3
                    style={{
                      fontFamily: "var(--serif)",
                      fontSize: 22,
                      fontWeight: 400,
                      marginBottom: 16,
                    }}
                  >
                    Live Predictions
                    <span style={{ fontSize: 14, color: "var(--gray-400)", fontFamily: "var(--mono)", marginLeft: 12 }}>
                      {results.length} random patients
                    </span>
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "80px 70px 60px 1fr 80px 40px",
                      gap: 12,
                      padding: "8px 20px",
                      fontSize: 11,
                      fontFamily: "var(--mono)",
                      color: "var(--gray-400)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <span>Patient</span>
                    <span>Score</span>
                    <span>Actual</span>
                    <span>Symptoms</span>
                    <span>Platelets</span>
                    <span></span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {results.map((r, i) => (
                      <PatientRow key={r.id} r={r} index={i} />
                    ))}
                  </div>
                </div>

                {!running && (
                  <>
                    <h3
                      style={{
                        fontFamily: "var(--serif)",
                        fontSize: 22,
                        fontWeight: 400,
                        marginBottom: 8,
                      }}
                    >
                      Full Dataset Results
                      <span style={{ fontSize: 14, color: "var(--gray-400)", fontFamily: "var(--mono)", marginLeft: 12 }}>
                        141 patients from Kisumu County, Kenya
                      </span>
                    </h3>
                    <p
                      style={{
                        fontSize: 14,
                        color: "var(--gray-600)",
                        marginBottom: 24,
                        lineHeight: 1.6,
                      }}
                    >
                      Confusion matrix from running all 141 patients through the 16-qubit quantum fidelity kernel.
                    </p>
                    <ConfusionMatrix tp={34} fn={23} fp={7} tn={77} />
                  </>
                )}

                <p
                  style={{
                    fontSize: 13,
                    color: "var(--gray-400)",
                    fontFamily: "var(--mono)",
                    textAlign: "center",
                  }}
                >
                  Data from 498-patient leptospirosis dataset (Kisumu County, Kenya).
                  Each prediction runs a live 16-qubit quantum circuit simulation.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
