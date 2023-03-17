function cb_print(tag, timestamp, record)
    -- inject time field in utc time zone in iso8601 format with millisecond
    -- http://www.lua.org/manual/5.2/manual.html#pdf-os.date
    record['$TIME_KEY'] = os.date('!%Y-%m-%dT%H:%M:%S.', timestamp['sec']) .. string.sub(string.format('%06d', timestamp['nsec']), 1, 6) .. 'Z'
    return 2, timestamp, record
end