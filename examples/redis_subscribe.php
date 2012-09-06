#!/usr/bin/env php
<?php

$redis = new Redis();
$redis->pconnect('127.0.0.1', 6379);
//$redis->subscribe(array(
//		array('t'=>'event','k'=>'*'),
//		array('t'=>'message','k'=>'*'),
//	), 'handleChannelEvent');

function echoEvent($redis, $channel, $message) {
	echo "'$channel' message: '$message'\n";
}

$redis->subscribe(array('event'), 'echoEvent');

