-- Fix emergency creation issue by updating the INSERT policy
-- The issue is that we need to ensure staff can create emergencies properly

-- Drop and recreate the INSERT policy for emergencies
DROP POLICY IF EXISTS "Staff can create emergencies" ON public.emergencies;

CREATE POLICY "Medical staff can create emergencies" 
ON public.emergencies 
FOR INSERT 
WITH CHECK (public.is_medical_staff());

-- Also ensure the triggered_by field is handled properly in the emergency creation
-- Let's also check if we need to update the UPDATE policy
DROP POLICY IF EXISTS "Staff and doctors can update emergencies" ON public.emergencies;

CREATE POLICY "Medical staff can update emergencies" 
ON public.emergencies 
FOR UPDATE 
USING (public.is_medical_staff());