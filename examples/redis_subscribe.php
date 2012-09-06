#!/usr/bin/env php
<?php

$redis = new Redis();
$redis->connect('127.0.0.1', 6379);
function echoEvent($redis, $channel, $message) {
	echo "'$channel' message: '$message'\n";
}
$redis->subscribe(array('event'), 'echoEvent');

