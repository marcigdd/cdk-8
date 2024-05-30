CREATE TYPE cart_status AS ENUM ('OPEN', 'ORDERED');

CREATE TABLE carts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status cart_status NOT NULL
);

CREATE TABLE cart_items (
  cart_id UUID REFERENCES carts(id),
  product_id UUID,
  count INTEGER
);