from typing import Tuple


def cat(*s: str, sep: str = '\n') -> str:
    return sep.join(s)


class ConfigSection:
    def __init__(self, section: str, **kvs):
        self._section = section.upper()
        self._kv = {**kvs}

    def section(self) -> str:
        return self._section

    def set(self, key: str, val: str):
        self._kv[key] = val
        return self

    def unset(self, key: str):
        del self._kv[key]
        return self

    def __repr__(self) -> str:
        keys = self._kv.keys()
        width = max(map(len, keys)) if len(keys) > 0 else 0

        def _kv2str(each: Tuple):
            k, v = each
            if v:
                return f'    {k.ljust(width)}    {v}'
            return None

        return cat(
            f'[{self._section}]',
            *filter(bool, map(_kv2str, self._kv.items())),
        )


class ServiceConfigSection(ConfigSection):
    def __init__(self, **kvs):
        super(ServiceConfigSection, self).__init__('SERVICE', **kvs)


class InputConfigSection(ConfigSection):
    def __init__(self, **kvs):
        super(InputConfigSection, self).__init__('INPUT', **kvs)


class OutputConfigSection(ConfigSection):
    def __init__(self, **kvs):
        super(OutputConfigSection, self).__init__('OUTPUT', **kvs)


class FilterConfigSection(ConfigSection):
    def __init__(self, **kvs):
        super(FilterConfigSection, self).__init__('FILTER', **kvs)


class ParserConfigSection(ConfigSection):
    def __init__(self, **kvs):
        super(ParserConfigSection, self).__init__('PARSER', **kvs)


class FluentBitConfigHelper:
    def __init__(self):
        self._service = ServiceConfigSection()
        self._inputs: list[InputConfigSection] = []
        self._filters: list[FilterConfigSection] = []
        self._outputs: list[OutputConfigSection] = []
        self._parsers: list[ParserConfigSection] = []
        self._configs: dict = {}

    def get_service(self):
        return self._service

    def set_service(self, cs: ServiceConfigSection):
        assert cs.section() == 'SERVICE', 'Invalid service section specified'
        self._service = cs

    def add_input(self, *cs: InputConfigSection):
        for c in cs:
            assert c.section() == 'INPUT', 'Invalid input section specified'
            self._inputs.append(c)

    def add_output(self, *cs: OutputConfigSection):
        for c in cs:
            assert c.section() == 'OUTPUT', 'Invalid output section specified'
            self._outputs.append(c)

    def add_filter(self, *cs: FilterConfigSection):
        for c in cs:
            assert c.section() == 'FILTER', 'Invalid filter section specified'
            self._filters.append(c)

    def add_parser(self, *cs: ParserConfigSection):
        for c in cs:
            assert c.section() == 'PARSER', 'Invalid parser section specified'
            self._parsers.append(c)

    def set_config(self, key: str, val: str):
        self._configs[key] = val

    def get_configs(self):
        return {
            'fluent-bit.conf': self.fluent_bit_config(),
            'applog_parsers.conf': self.parsers_config(),
            **self._configs,
        }

    def fluent_bit_config(self) -> str:
        return cat(
            str(self._service),
            *map(str, self._inputs),
            *map(str, self._outputs),
            *map(str, self._filters),
            '',
            sep='\n\n'
        )

    def parsers_config(self) -> str:
        return cat(
            *map(str, self._parsers),
        )
