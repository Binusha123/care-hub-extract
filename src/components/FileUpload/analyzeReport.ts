import { AnalysisResult } from './types';

// Mock AI analysis function with more realistic and varied results
export const analyzeReport = (file: File): Promise<AnalysisResult> => {
  return new Promise((resolve) => {
    // Simulate processing time
    setTimeout(() => {
      // Generate more realistic data based on file name or random factors
      const fileNameLower = file.name.toLowerCase();
      const isBloodTest = fileNameLower.includes('blood') || fileNameLower.includes('lab');
      const isCardiacTest = fileNameLower.includes('cardiac') || fileNameLower.includes('heart');
      const isDiabetesTest = fileNameLower.includes('diabetes') || fileNameLower.includes('sugar');
      
      // Generate varied realistic results
      const scenarios = [
        // High-risk scenario
        {
          diseases: ["Type 2 Diabetes", "Hypertension", "Hyperlipidemia"],
          bloodPressure: `${150 + Math.floor(Math.random() * 20)}/${95 + Math.floor(Math.random() * 15)}`,
          bloodSugar: `${200 + Math.floor(Math.random() * 100)} mg/dL`,
          cholesterol: `${250 + Math.floor(Math.random() * 50)} mg/dL`,
          riskLevel: "High",
          riskPercentage: 75 + Math.floor(Math.random() * 20),
          recommendations: [
            "Immediate consultation with endocrinologist required",
            "Start anti-diabetic medication as prescribed",
            "Strict dietary modifications needed",
            "Regular blood pressure monitoring essential"
          ]
        },
        // Moderate risk scenario
        {
          diseases: ["Pre-diabetes", "Mild Hypertension"],
          bloodPressure: `${130 + Math.floor(Math.random() * 15)}/${80 + Math.floor(Math.random() * 10)}`,
          bloodSugar: `${110 + Math.floor(Math.random() * 25)} mg/dL`,
          cholesterol: `${200 + Math.floor(Math.random() * 40)} mg/dL`,
          riskLevel: "Moderate",
          riskPercentage: 35 + Math.floor(Math.random() * 25),
          recommendations: [
            "Lifestyle modifications recommended",
            "Regular exercise and diet control",
            "Follow-up testing in 3 months",
            "Monitor blood pressure weekly"
          ]
        },
        // Low risk scenario
        {
          diseases: ["Normal Range", "Excellent Health"],
          bloodPressure: `${110 + Math.floor(Math.random() * 15)}/${70 + Math.floor(Math.random() * 10)}`,
          bloodSugar: `${80 + Math.floor(Math.random() * 20)} mg/dL`,
          cholesterol: `${150 + Math.floor(Math.random() * 30)} mg/dL`,
          riskLevel: "Low",
          riskPercentage: 5 + Math.floor(Math.random() * 15),
          recommendations: [
            "Continue current healthy lifestyle",
            "Annual health checkups recommended",
            "Maintain regular exercise routine",
            "Balanced diet maintenance"
          ]
        },
        // Cardiac risk scenario
        {
          diseases: ["Coronary Artery Disease Risk", "High Cholesterol"],
          bloodPressure: `${140 + Math.floor(Math.random() * 20)}/${90 + Math.floor(Math.random() * 10)}`,
          bloodSugar: `${95 + Math.floor(Math.random() * 15)} mg/dL`,
          cholesterol: `${240 + Math.floor(Math.random() * 40)} mg/dL`,
          riskLevel: "High",
          riskPercentage: 65 + Math.floor(Math.random() * 25),
          recommendations: [
            "Urgent cardiology consultation needed",
            "Cholesterol-lowering medication required",
            "Cardiac stress test recommended",
            "Immediate lifestyle changes essential"
          ]
        }
      ];
      
      // Select scenario based on file type or random
      let selectedScenario;
      if (isDiabetesTest) {
        selectedScenario = Math.random() > 0.6 ? scenarios[0] : scenarios[1];
      } else if (isCardiacTest) {
        selectedScenario = Math.random() > 0.5 ? scenarios[3] : scenarios[1];
      } else if (isBloodTest) {
        selectedScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
      } else {
        selectedScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
      }
      
      resolve(selectedScenario);
    }, 2000);
  });
};