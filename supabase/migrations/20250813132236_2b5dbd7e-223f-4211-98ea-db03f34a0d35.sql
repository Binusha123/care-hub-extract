-- Fix RLS security issue: Enable Row Level Security on tables that have policies but RLS is disabled

-- Enable RLS on doctor_shifts table
ALTER TABLE public.doctor_shifts ENABLE ROW LEVEL SECURITY;

-- Enable RLS on emergencies table  
ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;

-- Enable RLS on patients_today table
ALTER TABLE public.patients_today ENABLE ROW LEVEL SECURITY;