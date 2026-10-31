-- Read-only production gate. NEVER cleans or overwrites a municipal record.
-- These are known placeholder values in the archived baseline migration.
-- A clean result does not replace municipal editorial / DPO approval.
DO $verify$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.barangays
    WHERE (id='poblacion' AND captain='Hon. Juan dela Cruz')
       OR (id='san_francisco' AND captain='Hon. Maria Clara')
       OR (id='san_jose' AND captain='Hon. Jose Rizal')
       OR (id='san_agustin' AND captain='Hon. Andres Bonifacio')
  ) THEN
    RAISE EXCEPTION 'Production blocked: demo barangay officials remain. Verify and correct using an approved, backed-up data-change procedure.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.departments
    WHERE (id='treasury' AND head_of_office='Mr. Roberto Castro')
       OR (id='assessor' AND head_of_office='Engr. Manuel Santos')
       OR (id='mpdo' AND head_of_office='Arch. Teresa Lim')
       OR (id='tourism' AND head_of_office='Mr. Christopher Mendez')
  ) THEN
    RAISE EXCEPTION 'Production blocked: demo department officials remain. Review against signed LGU data inventory.';
  END IF;
END
$verify$;
