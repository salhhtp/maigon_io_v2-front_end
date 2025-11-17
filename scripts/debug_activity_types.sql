select constraint_name, check_clause from information_schema.check_constraints where constraint_name = 'user_activities_activity_type_check';
select constraint_name, check_clause from information_schema.check_constraints where constraint_name = 'contracts_user_id_fkey';
