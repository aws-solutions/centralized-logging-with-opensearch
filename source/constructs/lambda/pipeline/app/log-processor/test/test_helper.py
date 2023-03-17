from util.helper import tsv2json, fillna


def test_tsv2json():
    s = "a\tb\tc\t-\r\n"
    o = tsv2json(s, fieldnames=(1, 2, 3, 4))

    assert o == [{1: "a", 2: "b", 3: "c", 4: "-"}]


def test_fillna():
    s = "a\tb\tc\t-\r\n"
    o = fillna(tsv2json(s, fieldnames=(1, 2, 3, 4)))

    assert o == [{1: "a", 2: "b", 3: "c", 4: None}]

    o = fillna(tsv2json(s, fieldnames=(1, 2, 3, 4)), "null")

    assert o == [{1: "a", 2: "b", 3: "c", 4: "null"}]


def test_fillna_with_dict():
    s = "-\tb\t-\t-\r\n"
    o = tsv2json(s, fieldnames=(1, 2, 3, 4))

    assert o == [{1: "-", 2: "b", 3: "-", 4: "-"}]

    o = fillna(o, {1: "null1", 2: "null2", 3: "null3", 4: "null4"})

    assert o == [{1: "null1", 2: "b", 3: "null3", 4: "null4"}]
