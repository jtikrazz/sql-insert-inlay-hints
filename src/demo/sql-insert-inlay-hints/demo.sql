INSERT INTO my_big_table
    (one, two, three, four, five, six, seven)
VALUES
    (1, 2, 3, 4, 5, 6, 7);

INSERT INTO multiple_rows
    (pk, fk, val1, val2)
VALUES
    (pk1, fk1, val11, val21),
    (pk2, fk2, val12, val22),
    (pk3, fk3, val13, val23),
    (pk4, fk4, val14, val24),
    (pk5, fk5, val15, val25);

INSERT INTO `notify` (`notify_id`, `notify_name`)
VALUES (1, 'google_notify_record');

INSERT INTO rush_order.pizza (id, name, address)
VALUES (1, 'Jonh', '1234 Main St.');