-- Improve profile creation to support Google metadata keys.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  first_name_value text;
  last_name_value text;
  full_name_value text;
  first_token text;
begin
  first_name_value := coalesce(
    nullif(trim(new.raw_user_meta_data->>'first_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'given_name'), '')
  );

  last_name_value := coalesce(
    nullif(trim(new.raw_user_meta_data->>'last_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'family_name'), '')
  );

  full_name_value := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), '')
  );

  if first_name_value is null and full_name_value is not null then
    first_token := split_part(full_name_value, ' ', 1);
    first_name_value := nullif(trim(first_token), '');

    if strpos(full_name_value, ' ') > 0 then
      last_name_value := coalesce(
        last_name_value,
        nullif(trim(substr(full_name_value, length(first_token) + 1)), '')
      );
    end if;
  end if;

  insert into public.profiles (id, first_name, last_name)
  values (new.id, first_name_value, last_name_value);

  return new;
end;
$$;
