#!/usr/bin/env bash

for i in {1..10}; do
	printf "api.get|1" | nc -u -w1 127.0.0.1 6125
done
