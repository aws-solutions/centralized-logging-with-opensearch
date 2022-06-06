function cb_print(tag, timestamp, record)
    record['time'] = string.format(
        '%s.%sZ',
        os.date('%Y-%m-%dT%H:%M:%S', timestamp['sec']),
        string.sub(string.format('%06d', timestamp['nsec']), 1, 6)
    )
    return 2, timestamp, record
end