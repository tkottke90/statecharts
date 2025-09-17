/**
 * External Communication - Usage Examples
 * 
 * This file demonstrates various ways to use the External Communication system
 * with <send> and <param> elements for HTTP requests, webhooks, and inter-service communication.
 */

import { StateChart } from '../src/statechart';
import { EventIOProcessorRegistry, HTTPProcessor, SCXMLProcessor } from '../src/models/event-io-processor';

// Example 1: Basic HTTP Request with Send Node
export function basicHttpRequest() {
  const xmlString = `
    <scxml xmlns="http://www.w3.org/2005/07/scxml" version="1.0" datamodel="ecmascript">
      <datamodel>
        <data id="user" expr="{ id: 123, name: 'John Doe', email: 'john@example.com' }"/>
        <data id="apiUrl" expr="'https://jsonplaceholder.typicode.com/posts'"/>
        <data id="sendId" expr="''"/>
      </datamodel>
      
      <state id="idle">
        <transition event="createUser" target="sendingRequest"/>
      </state>
      
      <state id="sendingRequest">
        <onentry>
          <!-- Send HTTP POST request with user data -->
          <send event="userCreate" 
                targetexpr="data.apiUrl" 
                type="http"
                idlocation="data.sendId">
            <param name="title" expr="'User: ' + data.user.name"/>
            <param name="body" expr="'Creating user with email: ' + data.user.email"/>
            <param name="userId" expr="data.user.id"/>
          </send>
        </onentry>
        
        <transition event="http.success" target="success"/>
        <transition event="error.communication" target="failed"/>
      </state>
      
      <state id="success">
        <onentry>
          <log expr="'User created successfully with send ID: ' + data.sendId"/>
        </onentry>
        <transition event="reset" target="idle"/>
      </state>
      
      <state id="failed">
        <onentry>
          <log expr="'Failed to create user'"/>
        </onentry>
        <transition event="retry" target="sendingRequest"/>
        <transition event="reset" target="idle"/>
      </state>
    </scxml>
  `;

  const stateChart = StateChart.fromXML(xmlString);
  return stateChart;
}

// Example 2: Webhook Notification System
export function webhookNotificationSystem() {
  const xmlString = `
    <scxml xmlns="http://www.w3.org/2005/07/scxml" version="1.0" datamodel="ecmascript">
      <datamodel>
        <data id="order" expr="{ 
          id: 'ORD-001', 
          total: 99.99, 
          customer: { name: 'Jane Smith', email: 'jane@example.com' },
          items: [{ name: 'Widget', quantity: 2, price: 49.99 }]
        }"/>
        <data id="webhookUrl" expr="'https://webhook.site/your-webhook-url'"/>
        <data id="notificationsSent" expr="0"/>
      </datamodel>
      
      <state id="orderReceived">
        <onentry>
          <!-- Notify inventory system -->
          <send event="inventoryCheck" 
                targetexpr="data.webhookUrl + '/inventory'" 
                type="http">
            <param name="orderId" expr="data.order.id"/>
            <param name="items" expr="JSON.stringify(data.order.items)"/>
            <param name="timestamp" expr="Date.now()"/>
          </send>
        </onentry>
        
        <transition event="inventoryAvailable" target="processPayment"/>
        <transition event="inventoryUnavailable" target="backorder"/>
      </state>
      
      <state id="processPayment">
        <onentry>
          <!-- Send payment processing request -->
          <send event="processPayment" 
                targetexpr="data.webhookUrl + '/payment'" 
                type="http"
                delay="1s">
            <param name="orderId" expr="data.order.id"/>
            <param name="amount" expr="data.order.total"/>
            <param name="customerEmail" expr="data.order.customer.email"/>
          </send>
        </onentry>
        
        <transition event="paymentSuccess" target="fulfillment"/>
        <transition event="paymentFailed" target="paymentRetry"/>
      </state>
      
      <state id="fulfillment">
        <onentry>
          <!-- Notify fulfillment center -->
          <send event="fulfillOrder" 
                targetexpr="data.webhookUrl + '/fulfillment'" 
                type="http">
            <param name="orderId" expr="data.order.id"/>
            <param name="customerName" expr="data.order.customer.name"/>
            <param name="shippingAddress" expr="'123 Main St'"/>
          </send>
          
          <!-- Send customer notification -->
          <send event="orderConfirmation" 
                targetexpr="data.webhookUrl + '/notifications'" 
                type="http"
                delay="2s">
            <param name="to" expr="data.order.customer.email"/>
            <param name="subject">Order Confirmation</param>
            <param name="orderId" expr="data.order.id"/>
            <param name="message" expr="'Your order ' + data.order.id + ' has been confirmed!'"/>
          </send>
          
          <assign location="data.notificationsSent" expr="data.notificationsSent + 1"/>
        </onentry>
        
        <transition event="orderShipped" target="completed"/>
      </state>
      
      <state id="paymentRetry">
        <onentry>
          <!-- Retry payment with delay -->
          <send event="retryPayment" 
                targetexpr="data.webhookUrl + '/payment/retry'" 
                type="http"
                delay="5s">
            <param name="orderId" expr="data.order.id"/>
            <param name="retryAttempt" expr="1"/>
          </send>
        </onentry>
        
        <transition event="paymentSuccess" target="fulfillment"/>
        <transition event="paymentFailed" target="cancelled"/>
      </state>
      
      <state id="backorder">
        <onentry>
          <!-- Notify customer about backorder -->
          <send event="backorderNotification" 
                targetexpr="data.webhookUrl + '/notifications'" 
                type="http">
            <param name="to" expr="data.order.customer.email"/>
            <param name="subject">Order Backordered</param>
            <param name="orderId" expr="data.order.id"/>
            <param name="estimatedDate" expr="'2024-02-01'"/>
          </send>
        </onentry>
        
        <transition event="inventoryRestocked" target="processPayment"/>
      </state>
      
      <state id="cancelled">
        <onentry>
          <log expr="'Order cancelled: ' + data.order.id"/>
        </onentry>
      </state>
      
      <state id="completed">
        <onentry>
          <log expr="'Order completed: ' + data.order.id + ', notifications sent: ' + data.notificationsSent"/>
        </onentry>
      </state>
    </scxml>
  `;

  const stateChart = StateChart.fromXML(xmlString);
  return stateChart;
}

// Example 3: API Integration with Error Handling
export function apiIntegrationWithErrorHandling() {
  const xmlString = `
    <scxml xmlns="http://www.w3.org/2005/07/scxml" version="1.0" datamodel="ecmascript">
      <datamodel>
        <data id="apiEndpoint" expr="'https://jsonplaceholder.typicode.com/users'"/>
        <data id="retryCount" expr="0"/>
        <data id="maxRetries" expr="3"/>
        <data id="backoffDelay" expr="1000"/>
        <data id="userId" expr="1"/>
        <data id="userData" expr="null"/>
      </datamodel>
      
      <state id="fetchUser">
        <onentry>
          <assign location="data.retryCount" expr="data.retryCount + 1"/>
          
          <!-- Fetch user data with exponential backoff -->
          <send event="getUserData" 
                targetexpr="data.apiEndpoint + '/' + data.userId" 
                type="http"
                delayexpr="data.retryCount > 1 ? (data.backoffDelay * Math.pow(2, data.retryCount - 2)) + 'ms' : '0ms'">
            <param name="headers" expr="{ 'Accept': 'application/json' }"/>
          </send>
        </onentry>
        
        <transition event="http.success" target="processData">
          <assign location="data.userData" expr="_event.data"/>
        </transition>
        
        <transition event="error.communication" target="retryOrFail" cond="data.retryCount &lt; data.maxRetries"/>
        <transition event="error.communication" target="failed" cond="data.retryCount >= data.maxRetries"/>
      </state>
      
      <state id="retryOrFail">
        <transition target="fetchUser" delay="1s"/>
      </state>
      
      <state id="processData">
        <onentry>
          <log expr="'Successfully fetched user: ' + data.userData.name"/>
          
          <!-- Send processed data to another service -->
          <send event="updateUserProfile" 
                target="https://webhook.site/update-profile" 
                type="http">
            <param name="userId" expr="data.userData.id"/>
            <param name="name" expr="data.userData.name"/>
            <param name="email" expr="data.userData.email"/>
            <param name="processedAt" expr="new Date().toISOString()"/>
          </send>
        </onentry>
        
        <transition event="http.success" target="completed"/>
        <transition event="error.communication" target="failed"/>
      </state>
      
      <state id="failed">
        <onentry>
          <log expr="'Failed to fetch user data after ' + data.retryCount + ' attempts'"/>
        </onentry>
      </state>
      
      <state id="completed">
        <onentry>
          <log expr="'User data processing completed successfully'"/>
        </onentry>
      </state>
    </scxml>
  `;

  const stateChart = StateChart.fromXML(xmlString);
  return stateChart;
}

// Example 4: Using Namelist for Data Transmission
export function namelistDataTransmission() {
  const xmlString = `
    <scxml xmlns="http://www.w3.org/2005/07/scxml" version="1.0" datamodel="ecmascript">
      <datamodel>
        <data id="sessionId" expr="'sess_' + Date.now()"/>
        <data id="userId" expr="12345"/>
        <data id="preferences" expr="{ theme: 'dark', language: 'en' }"/>
        <data id="lastActivity" expr="Date.now()"/>
        <data id="analyticsEndpoint" expr="'https://analytics.example.com/track'"/>
      </datamodel>
      
      <state id="trackingSession">
        <onentry>
          <!-- Send analytics data using namelist -->
          <send event="sessionStart" 
                targetexpr="data.analyticsEndpoint" 
                type="http"
                namelist="data.sessionId data.userId data.preferences.theme data.preferences.language">
            <param name="eventType">session_start</param>
            <param name="timestamp" expr="new Date().toISOString()"/>
          </send>
        </onentry>
        
        <transition event="userAction" target="trackingAction"/>
        <transition event="sessionEnd" target="endSession"/>
      </state>
      
      <state id="trackingAction">
        <onentry>
          <assign location="data.lastActivity" expr="Date.now()"/>
          
          <!-- Track user action with both params and namelist -->
          <send event="userAction" 
                targetexpr="data.analyticsEndpoint" 
                type="http"
                namelist="data.sessionId data.userId data.lastActivity">
            <param name="eventType">user_action</param>
            <param name="action" expr="_event.data.action"/>
            <param name="timestamp" expr="new Date().toISOString()"/>
          </send>
        </onentry>
        
        <transition event="userAction" target="trackingAction"/>
        <transition event="sessionEnd" target="endSession"/>
      </state>
      
      <state id="endSession">
        <onentry>
          <!-- Send session end analytics -->
          <send event="sessionEnd" 
                targetexpr="data.analyticsEndpoint" 
                type="http"
                namelist="data.sessionId data.userId data.lastActivity">
            <param name="eventType">session_end</param>
            <param name="duration" expr="Date.now() - parseInt(data.sessionId.split('_')[1])"/>
            <param name="timestamp" expr="new Date().toISOString()"/>
          </send>
        </onentry>
      </state>
    </scxml>
  `;

  const stateChart = StateChart.fromXML(xmlString);
  return stateChart;
}

// Example 5: Complete Working HTTP Example with Setup
export async function completeHttpExample() {
  // Set up the Event I/O Processor Registry
  const registry = new EventIOProcessorRegistry();
  registry.register(new HTTPProcessor());
  registry.register(new SCXMLProcessor());
  registry.setDefault(new HTTPProcessor());

  const xmlString = `
    <scxml xmlns="http://www.w3.org/2005/07/scxml" version="1.0" datamodel="ecmascript">
      <datamodel>
        <data id="postData" expr="{
          title: 'External Communication Test',
          body: 'Testing SCXML send node with HTTP processor',
          userId: 1
        }"/>
        <data id="responseData" expr="null"/>
        <data id="sendId" expr="''"/>
      </datamodel>

      <state id="ready">
        <transition event="makeRequest" target="sending"/>
      </state>

      <state id="sending">
        <onentry>
          <log expr="'Sending HTTP request...'"/>
          <send event="createPost"
                target="https://jsonplaceholder.typicode.com/posts"
                type="http"
                idlocation="data.sendId">
            <param name="title" expr="data.postData.title"/>
            <param name="body" expr="data.postData.body"/>
            <param name="userId" expr="data.postData.userId"/>
          </send>
        </onentry>

        <transition event="http.success" target="success">
          <assign location="data.responseData" expr="_event.data"/>
        </transition>

        <transition event="error.communication" target="error"/>
      </state>

      <state id="success">
        <onentry>
          <log expr="'Request successful! Response: ' + JSON.stringify(data.responseData)"/>
          <log expr="'Send ID was: ' + data.sendId"/>
        </onentry>
        <transition event="reset" target="ready"/>
      </state>

      <state id="error">
        <onentry>
          <log expr="'Request failed: ' + JSON.stringify(_event.data)"/>
        </onentry>
        <transition event="retry" target="sending"/>
        <transition event="reset" target="ready"/>
      </state>
    </scxml>
  `;

  // Create StateChart with the configured registry
  const stateChart = StateChart.fromXML(xmlString);

  // Set up event listeners for HTTP responses
  registry.on('eventSent', (event, target, result) => {
    console.log(`✅ Event sent: ${event.name} to ${target}`);
    if (result.success) {
      // Simulate HTTP success response
      stateChart.sendEvent('http.success', {
        id: 101,
        title: event.data?.title,
        body: event.data?.body,
        userId: event.data?.userId
      });
    }
  });

  registry.on('sendError', (event, target, error) => {
    console.log(`❌ Send error: ${event.name} to ${target}`, error);
    stateChart.sendEvent('error.communication', { error: error.message });
  });

  return { stateChart, registry };
}

// Demo function to run examples
export async function runExternalCommunicationExamples() {
  console.log('=== External Communication Examples ===\n');

  // Example 1: Basic HTTP Request
  console.log('1. Basic HTTP Request Example:');
  const basicExample = basicHttpRequest();
  console.log('- Created state machine with HTTP send capabilities');
  console.log('- Ready to send POST requests with parameters\n');

  // Example 2: Webhook System
  console.log('2. Webhook Notification System:');
  const webhookExample = webhookNotificationSystem();
  console.log('- Created order processing workflow');
  console.log('- Includes inventory, payment, and fulfillment webhooks\n');

  // Example 3: API Integration
  console.log('3. API Integration with Error Handling:');
  const apiExample = apiIntegrationWithErrorHandling();
  console.log('- Created resilient API client with retry logic');
  console.log('- Includes exponential backoff and error handling\n');

  // Example 4: Namelist Usage
  console.log('4. Namelist Data Transmission:');
  const namelistExample = namelistDataTransmission();
  console.log('- Created analytics tracking system');
  console.log('- Demonstrates namelist usage for data transmission\n');

  // Example 5: Complete Working Example
  console.log('5. Complete Working HTTP Example:');
  const { stateChart, registry } = await completeHttpExample();
  console.log('- Set up complete HTTP communication system');
  console.log('- Ready to make actual HTTP requests\n');

  // Demonstrate the working example
  console.log('🚀 Running live HTTP example...');
  stateChart.sendEvent('makeRequest');

  // Wait a moment for the async operations
  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('\nAll examples created successfully!');
  console.log('\n📚 Usage Notes:');
  console.log('1. The examples show different patterns for external communication');
  console.log('2. Use <param> elements for structured data passing');
  console.log('3. Use namelist for including data model variables');
  console.log('4. Handle delays for rate limiting and scheduling');
  console.log('5. Implement proper error handling and retry logic');
  console.log('6. Set up Event I/O Processor Registry for actual HTTP requests');
}
