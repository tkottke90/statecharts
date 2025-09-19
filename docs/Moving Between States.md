# Moving Between States

This guide explains how to author SCXML transitions to move between states in your state machine. Transitions are the mechanism that allows your state machine to respond to events and change from one state to another.

## Overview

In SCXML, transitions are defined using the `<transition>` element ([Transition Node Docs](../src/nodes/transition.md)).  This element targets a state that the StateChart should transition too when the condition is met.

These conditions and can be triggered by:
- **Events** (internal or external) - Such as the `<raise>` node OR calling `#sendEvent` on the StateChart
- **Conditions** (guard expressions) - By adding a `cond` attribute to the transition and evaluating the result of the state
- **Automatic transitions** (eventless) - Every time the state is evaluated, the transition is triggered

## Basic Transition Syntax

```xml
<transition event="event_name" target="target_state_id"/>
```

## Event-Driven Transitions

### External Events

External events come from outside the state machine (user input, network responses, timers, etc.).

```xml
<scxml xmlns="http://www.w3.org/2005/07/scxml" initial="idle">
  <state id="idle">
    <!-- Transition triggered by external "start" event -->
    <transition event="start" target="working"/>
  </state>
  
  <state id="working">
    <!-- Transition triggered by external "complete" event -->
    <transition event="complete" target="finished"/>
    <!-- Transition triggered by external "cancel" event -->
    <transition event="cancel" target="idle"/>
  </state>
  
  <final id="finished"/>
</scxml>
```

**What's happening:**
- The state machine starts in the `idle` state
- When a `start` event is received, it transitions to `working`
- From `working`, it can transition to `finished` on `complete` or back to `idle` on `cancel`

### Internal Events with `<raise>`

Internal events are generated within the state machine using the `<raise>` element.

```xml
<scxml xmlns="http://www.w3.org/2005/07/scxml" initial="preparing">
  <datamodel>
    <data id="message" expr="'Hello World'"/>
  </datamodel>
  
  <state id="preparing">
    <onentry>
      <!-- Process data and then raise an internal event -->
      <assign location="processedData" expr="data.message.toUpperCase()"/>
      <raise event="data.ready"/>
    </onentry>
    
    <!-- Transition triggered by internal event -->
    <transition event="data.ready" target="processing"/>
  </state>
  
  <state id="processing">
    <onentry>
      <log expr="'Processing: ' + data.processedData"/>
    </onentry>
  </state>
</scxml>
```

**What's happening:**
1. State machine enters `preparing` state
2. OnEntry handler processes the data and assigns result to `processedData`
3. `<raise event="data.ready"/>` generates an internal event
4. The transition responds to `data.ready` and moves to `processing` state
5. The `processing` state logs the processed data

## Conditional Transitions (Guards)

Use the `cond` attribute to add conditions that must be true for the transition to occur.

```xml
<scxml xmlns="http://www.w3.org/2005/07/scxml" initial="checking">
  <datamodel>
    <data id="score" expr="85"/>
    <data id="attempts" expr="1"/>
  </datamodel>
  
  <state id="checking">
    <onentry>
      <raise event="evaluate"/>
    </onentry>
    
    <!-- Multiple conditional transitions for the same event -->
    <transition event="evaluate" cond="data.score >= 90" target="excellent"/>
    <transition event="evaluate" cond="data.score >= 70" target="good"/>
    <transition event="evaluate" cond="data.score >= 50" target="passing"/>
    <transition event="evaluate" target="failing"/>
  </state>
  
  <state id="excellent">
    <onentry><log expr="'Excellent work!'"/></onentry>
  </state>
  
  <state id="good">
    <onentry><log expr="'Good job!'"/></onentry>
  </state>
  
  <state id="passing">
    <onentry><log expr="'You passed!'"/></onentry>
  </state>
  
  <state id="failing">
    <onentry>
      <log expr="'Try again!'"/>
      <assign location="attempts" expr="data.attempts + 1"/>
    </onentry>
    
    <!-- Conditional transition based on attempts -->
    <transition cond="data.attempts < 3" target="checking"/>
    <transition target="giveUp"/>
  </state>
  
  <final id="giveUp"/>
</scxml>
```

**What's happening:**
1. State machine starts in `checking` and raises `evaluate` event
2. Multiple transitions listen for `evaluate` but have different conditions
3. SCXML evaluates transitions in document order, taking the first one where `cond` is true
4. With `score=85`, it will transition to `good` (first condition that matches)
5. If in `failing` state, it checks attempts and either retries or gives up

## Eventless Transitions

Transitions without an `event` attribute are evaluated immediately when the state is entered.

```xml
<scxml xmlns="http://www.w3.org/2005/07/scxml" initial="router">
  <datamodel>
    <data id="userType" expr="'admin'"/>
  </datamodel>
  
  <state id="router">
    <!-- Eventless transitions - evaluated immediately on state entry -->
    <transition cond="data.userType === 'admin'" target="adminDashboard"/>
    <transition cond="data.userType === 'user'" target="userDashboard"/>
    <transition target="loginRequired"/>
  </state>
  
  <state id="adminDashboard">
    <onentry><log expr="'Welcome to admin dashboard'"/></onentry>
  </state>
  
  <state id="userDashboard">
    <onentry><log expr="'Welcome to user dashboard'"/></onentry>
  </state>
  
  <state id="loginRequired">
    <onentry><log expr="'Please log in first'"/></onentry>
  </state>
</scxml>
```

**What's happening:**
1. State machine enters `router` state
2. Immediately evaluates eventless transitions in document order
3. With `userType='admin'`, first condition is true, so transitions to `adminDashboard`
4. No events needed - the routing happens automatically based on data

## Transitions with Actions

Transitions can execute actions during the transition using executable content.

```xml
<scxml xmlns="http://www.w3.org/2005/07/scxml" initial="loggedOut">
  <datamodel>
    <data id="username" expr="''"/>
    <data id="loginTime" expr="null"/>
  </datamodel>
  
  <state id="loggedOut">
    <transition event="login" target="loggedIn">
      <!-- Actions executed during transition -->
      <assign location="username" expr="_event.data.username"/>
      <assign location="loginTime" expr="Date.now()"/>
      <log expr="'User ' + data.username + ' logged in at ' + data.loginTime"/>
    </transition>
  </state>
  
  <state id="loggedIn">
    <onentry>
      <log expr="'Welcome, ' + data.username + '!'"/>
    </onentry>
    
    <transition event="logout" target="loggedOut">
      <!-- Clear user data during logout transition -->
      <assign location="username" expr="''"/>
      <assign location="loginTime" expr="null"/>
      <log expr="'User logged out'"/>
    </transition>
  </state>
</scxml>
```

**What's happening:**
1. State machine starts in `loggedOut` state
2. When `login` event is received, the transition executes its actions:
   - Assigns username from event data
   - Records login time
   - Logs the login
3. Then transitions to `loggedIn` state
4. The `loggedIn` state's onentry handler welcomes the user
5. On `logout` event, transition actions clear the data before moving to `loggedOut`

## Compound State Transitions

Transitions can cross state boundaries in hierarchical state machines.

```xml
<scxml xmlns="http://www.w3.org/2005/07/scxml" initial="application">
  <state id="application" initial="menu">
    
    <state id="menu">
      <transition event="startGame" target="gameRunning"/>
      <transition event="openSettings" target="settings"/>
    </state>
    
    <state id="gameRunning" initial="playing">
      <state id="playing">
        <transition event="pause" target="paused"/>
        <transition event="gameOver" target="gameEnded"/>
      </state>
      
      <state id="paused">
        <transition event="resume" target="playing"/>
        <transition event="quit" target="menu"/>
      </state>
      
      <state id="gameEnded">
        <onentry>
          <log expr="'Game Over! Final score: ' + data.score"/>
        </onentry>
        <transition event="playAgain" target="playing"/>
        <transition event="mainMenu" target="menu"/>
      </state>
    </state>
    
    <state id="settings">
      <transition event="back" target="menu"/>
    </state>
    
    <!-- Global emergency transition from any child state -->
    <transition event="emergency.exit" target="menu"/>
  </state>
</scxml>
```

**What's happening:**
1. Complex hierarchical state structure with nested states
2. Transitions can move between sibling states (`playing` ↔ `paused`)
3. Transitions can move up the hierarchy (`quit` from `paused` to `menu`)
4. Transitions can move across different branches (`gameOver` to `gameEnded`)
5. Parent state can define global transitions that work from any child state

## Best Practices

### 1. Use Descriptive Event Names
```xml
<!-- Good -->
<raise event="data.validation.complete"/>
<raise event="user.authentication.failed"/>

<!-- Less clear -->
<raise event="done"/>
<raise event="error"/>
```

### 2. Order Transitions by Specificity
```xml
<!-- Most specific conditions first -->
<transition event="submit" cond="data.isValid && data.isComplete" target="success"/>
<transition event="submit" cond="data.isValid" target="incomplete"/>
<transition event="submit" target="invalid"/>
```

### 3. Use Internal Events for Multi-Step Processes
```xml
<state id="dataProcessor">
  <onentry>
    <assign location="step1Result" expr="processStep1(data.input)"/>
    <raise event="step1.complete"/>
  </onentry>
  
  <transition event="step1.complete" target="step2Processor"/>
</state>
```

### 4. Combine Conditions and Events
```xml
<transition event="retry" cond="data.attempts < 3" target="processing"/>
<transition event="retry" target="maxAttemptsReached"/>
```

This approach to state transitions provides a powerful and flexible way to model complex application logic while maintaining clear, readable SCXML code.
