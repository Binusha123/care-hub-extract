-- Fix security warnings by setting search_path for functions

-- Update clean_expired_availability function with secure search_path
CREATE OR REPLACE FUNCTION public.clean_expired_availability()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Delete expired availability slots
  DELETE FROM public.doctor_availability
  WHERE availability_date < CURRENT_DATE 
     OR (availability_date = CURRENT_DATE AND available_to < CURRENT_TIME);
  
  RETURN NULL;
END;
$$;

-- Update get_active_availability function with secure search_path
CREATE OR REPLACE FUNCTION public.get_active_availability(doctor_uuid UUID DEFAULT NULL)
RETURNS TABLE(
  id UUID,
  doctor_id UUID,
  available_from TIME,
  available_to TIME,
  availability_date DATE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  years_experience INTEGER,
  slot_duration INTEGER,
  specialization TEXT,
  gender TEXT,
  location TEXT,
  full_name TEXT,
  department TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Clean expired slots first
  DELETE FROM public.doctor_availability
  WHERE availability_date < CURRENT_DATE 
     OR (availability_date = CURRENT_DATE AND available_to < CURRENT_TIME);

  -- Return active availability
  RETURN QUERY
  SELECT da.*
  FROM public.doctor_availability da
  WHERE (doctor_uuid IS NULL OR da.doctor_id = doctor_uuid)
    AND (da.availability_date > CURRENT_DATE 
         OR (da.availability_date = CURRENT_DATE AND da.available_to >= CURRENT_TIME))
  ORDER BY da.availability_date, da.available_from;
END;
$$;