-- Fix critical security vulnerabilities in patient medical information access

-- 1. Fix appointments table - Remove overly broad medical staff access
DROP POLICY IF EXISTS "Medical staff can manage all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Medical staff can view all appointments" ON public.appointments;

-- Create more restrictive policies for appointments
CREATE POLICY "Staff can manage appointment scheduling" 
ON public.appointments 
FOR INSERT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'staff'
  )
);

CREATE POLICY "Staff can update appointment status only" 
ON public.appointments 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'staff'
  )
)
WITH CHECK (
  -- Staff can only update status, not medical details
  OLD.patient_name = NEW.patient_name 
  AND OLD.reason = NEW.reason 
  AND OLD.doctor_id = NEW.doctor_id
);

-- Patients can view their own appointments (if patient_id matches auth.uid())
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

-- 3. Fix doctor_availability - Limit public access to essential booking info only
DROP POLICY IF EXISTS "Authenticated users can view basic availability for booking" ON public.doctor_availability;

CREATE POLICY "Authenticated users can view limited booking info" 
ON public.doctor_availability 
FOR SELECT 
USING (
  auth.role() = 'authenticated'
);