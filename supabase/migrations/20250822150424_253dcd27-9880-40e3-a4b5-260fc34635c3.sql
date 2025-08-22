-- Fix security vulnerabilities by restricting access to sensitive patient data

-- First, create a security definer function to check if user is medical staff
CREATE OR REPLACE FUNCTION public.is_medical_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('doctor', 'staff')
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Drop and recreate the emergencies SELECT policy to restrict access to medical staff only
DROP POLICY IF EXISTS "Staff and doctors can view all emergencies" ON public.emergencies;

CREATE POLICY "Medical staff can view all emergencies" 
ON public.emergencies 
FOR SELECT 
USING (public.is_medical_staff());

-- Fix the patients_today table to restrict access to assigned doctors and staff
DROP POLICY IF EXISTS "Staff can view all patients" ON public.patients_today;

CREATE POLICY "Assigned doctors and staff can view patients" 
ON public.patients_today 
FOR SELECT 
USING (
  (auth.uid() = doctor_id) OR 
  public.is_medical_staff()
);

-- Fix doctor_shifts to restrict to medical staff and patients with appointments
DROP POLICY IF EXISTS "Staff and patients can view all doctor shifts" ON public.doctor_shifts;

CREATE POLICY "Medical staff can view doctor shifts" 
ON public.doctor_shifts 
FOR SELECT 
USING (
  (auth.uid() = doctor_id) OR 
  public.is_medical_staff()
);