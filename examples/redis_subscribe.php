#!/usr/bin/env php
<?php

$redis = new Redis();
$redis->connect('127.0.0.1', 6379);
$redis->subscribe(array('event|*','message|*'), 'handleChannelEvent');


function handleChannelEvent($redis, $channel, $message) {
	echo "'$channel' message: '$message'\n";
}
