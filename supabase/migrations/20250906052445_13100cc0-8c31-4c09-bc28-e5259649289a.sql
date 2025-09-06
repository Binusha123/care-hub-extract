-- Fix critical security vulnerabilities in patient medical information access

-- 1. Fix appointments table - Remove overly broad medical staff access
DROP POLICY IF EXISTS "Medical staff can manage all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Medical staff can view all appointments" ON public.appointments;

-- Create more restrictive policies for appointments
CREATE POLICY "Staff can create appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'staff'
  )
);

CREATE POLICY "Staff can update appointment status" 
ON public.appointments 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'staff'
  )
);

-- Patients can view their own appointments
CREATE POLICY "Patients can view their own appointments" 
ON public.appointments 
FOR SELECT 
USING (patient_id = auth.uid());

-- 2. Fix treatment_queue - Restrict patient access to verified identity only
DROP POLICY IF EXISTS "Patients can view their own treatment queue" ON public.treatment_queue;

CREATE POLICY "Patients can view their verified treatment queue" 
ON public.treatment_queue 
FOR SELECT 
USING (
  patient_id = auth.uid()::text 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'patient'
  )
);

-- 3. Add security definer function for safe profile checking
CREATE OR REPLACE FUNCTION public.is_verified_medical_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('doctor', 'staff')
    AND user_id IS NOT NULL
  );
$$;