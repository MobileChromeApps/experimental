//
//  Socket.m
//  Generic
//
//  Created by Michal Mocny on 11/29/12.
//
//

#import "Socket.h"
#import "GCDAsyncUdpSocket.h"
#import "NSData+Base64.h"
#import "NSString+Base64.h"

@implementation Socket

@synthesize sockets;
@synthesize socketsAddress;
@synthesize socketsPort;
@synthesize nextSocketId;

- (CDVPlugin*)initWithWebView:(UIWebView*)theWebView
{
    self = [super initWithWebView:theWebView];
    if (self) {
        sockets = [NSMutableDictionary dictionary];
        socketsAddress = [NSMutableDictionary dictionary];
        socketsPort = [NSMutableDictionary dictionary];
        nextSocketId = 0;
    }
    return self;
}

- (void)create:(CDVInvokedUrlCommand*)command {
    NSDictionary* options = [command.arguments objectAtIndex:0];
    
    NSString* socketMode = [options objectForKey:@"socketMode"];
    assert([socketMode isEqualToString:@"udp"]);
    
    GCDAsyncUdpSocket* socket = [[GCDAsyncUdpSocket alloc] initWithDelegate:self delegateQueue:dispatch_get_main_queue()];
    NSString* key = [[NSNumber numberWithUnsignedInteger:++nextSocketId] stringValue];
    [sockets setValue:socket forKey:key];
    
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:key] callbackId:command.callbackId];
}

- (void)connect:(CDVInvokedUrlCommand*)command {
    NSDictionary* options = [command.arguments objectAtIndex:0];
    NSString* socketId = [options objectForKey:@"socketId"];
    NSString* address = [options objectForKey:@"address"];
    NSUInteger port = [[options objectForKey:@"port"] unsignedIntegerValue];

    assert([sockets objectForKey:socketId] != nil);
    
    [socketsAddress setValue:address forKey:socketId];
    [socketsPort setValue:[NSNumber numberWithUnsignedInteger:port] forKey:socketId];
    
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:0] callbackId:command.callbackId];
}

- (void)write:(CDVInvokedUrlCommand*)command {
    NSDictionary* options = [command.arguments objectAtIndex:0];
    NSString* socketId = [options objectForKey:@"socketId"];
    NSString *payload = [options objectForKey:@"data"];
    // TODO: decode base64
//    NSData* data = [NSData dataWithBytes:payload length:[payload length]];
//    NSData* data = [payload dataUsingEncoding:NSUTF8StringEncoding];
    NSData* data = [NSData dataWithBase64EncodedString:payload];
    
    GCDAsyncUdpSocket* socket = [sockets objectForKey:socketId];
    NSString* address = [socketsAddress objectForKey:socketId];
    NSUInteger port = [[socketsPort objectForKey:socketId] unsignedIntegerValue];
    assert(socket != nil);
    assert(address != nil);
    assert(port != 0);
    
    NSLog(@"Sending: payload: %@, data: %@", payload, data);
    [socket sendData:data toHost:address port:port withTimeout:-1 tag:1]; // TODO: tag?
    
     //NSDictionary* result = [NSJSONSerialization JSONObjectWithData:[payload dataUsingEncoding:NSUTF8StringEncoding] options:NSJSONReadingMutableContainers error:nil]; //NSJSONReadingOptions
    
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsInt:0] callbackId:command.callbackId];
}

- (void)disconnect:(CDVInvokedUrlCommand*)command {
    NSDictionary* options = [command.arguments objectAtIndex:0];
    NSString* socketId = [options objectForKey:@"socketId"];
    
    assert([sockets objectForKey:socketId] != nil);
    assert([socketsAddress objectForKey:socketId] != nil);
    assert([socketsPort objectForKey:socketId] != nil);
    
    [socketsAddress removeObjectForKey:socketId];
    [socketsPort removeObjectForKey:socketId];
}

- (void)destroy:(CDVInvokedUrlCommand*)command {
    NSDictionary* options = [command.arguments objectAtIndex:0];
    NSString* socketId = [options objectForKey:@"socketId"];
    
    GCDAsyncUdpSocket* socket = [sockets objectForKey:socketId];
    assert(socket != nil);
    [socket closeAfterSending];
    
    [sockets removeObjectForKey:socketId];
}

@end
