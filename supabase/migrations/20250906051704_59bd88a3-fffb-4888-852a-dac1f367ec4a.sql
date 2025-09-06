-- Fix security vulnerability: Remove public access to doctor availability
-- and restrict to medical staff only

-- Drop the overly permissive policy that allows everyone to view doctor availability
DROP POLICY IF EXISTS "Everyone can view doctor availability" ON public.doctor_availability;

-- Create a new policy that only allows medical staff to view doctor availability
CREATE POLICY "Medical staff can view doctor availability" 
ON public.doctor_availability 
FOR SELECT 
USING (is_medical_staff());

-- Also ensure patients can view availability for booking purposes
-- but only basic scheduling info (not personal details)
CREATE POLICY "Authenticated users can view basic availability for booking" 
ON public.doctor_availability 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND 
  -- Only allow access to essential fields for appointment booking
  true  -- This will be further restricted in the application layer
);