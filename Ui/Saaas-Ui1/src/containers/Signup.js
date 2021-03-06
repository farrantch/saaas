import React, { Component } from "react";
import {
  HelpBlock,
  FormGroup,
  FormControl,
  ControlLabel
} from "react-bootstrap";
import LoaderButton from "../components/LoaderButton";
import "./Signup.css";
import {
  AuthenticationDetails,
  CognitoUserPool,
  CognitoUserAttribute
} from "amazon-cognito-identity-js";
import config from "../config.json";
import Phone from "react-phone-number-input";
import "react-phone-number-input/rrui.css";
import "react-phone-number-input/style.css";
import "react-datetime/css/react-datetime.css";
import Datetime from "react-datetime";
import Moment from 'react-moment';
import { invokeApig } from "../libs/awsLib";
import uuid from "uuid";

export default class Signup extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoading: false,
      email: "",
      password: "",
      confirmPassword: "",
      confirmationCode: "",
      newUser: null
    };
  }

  validateForm() {
    return (
      this.state.email.length > 0 &&
      this.state.password.length > 0 &&
      this.state.password === this.state.confirmPassword
    );
  }

  validateConfirmationForm() {
    return(
      this.state.confirmationCode.length > 0
    );
  }

  handleChange = event => {
    this.setState({
      [event.target.id]: event.target.value
    });
  }

	handleSubmit = async event => {
	  event.preventDefault();

	  this.setState({ isLoading: true });

	  try {
    const newUser = await this.signup(this.state.email, this.state.password, this.state.firstName, this.state.lastName, this.state.phoneNumber, this.state.birthDate);
		this.setState({
		  newUser: newUser
		});
	  } catch (e) {
		alert(e);
	  }

	  this.setState({ isLoading: false });
  }

  renderBanner() {
		return (
			<div className="lander">
				<h1>SaaaS</h1>
				<p>Sysadmin-as-a-Service</p>
			</div>
		);
	}
  
  createUser(user) {
    return invokeApig({
      path: "/users",
      method: "POST",
      body: user
    });
  }

	handleConfirmationSubmit = async event => {
	  event.preventDefault();

	  this.setState({ isLoading: true });

	  try {
		await this.confirm(this.state.newUser, this.state.confirmationCode);
		await this.authenticate(
		  this.state.newUser,
		  this.state.email,
		  this.state.password
		);

		this.props.userHasAuthenticated(true);
		this.props.history.push("/");
    await this.createUser({
      email: this.state.email,
      stripeCustomer: null
    });
	  } catch (e) {
		alert(e);
		this.setState({ isLoading: false });
	  }
  }

	signup(email, password, firstName, lastName, phoneNumber, birthDate) {
	  const userPool = new CognitoUserPool({
		UserPoolId: config.cognito.USER_POOL_ID,
		ClientId: config.cognito.APP_CLIENT_ID
	  });
	  
    var attributeList = [];
    
    var username = uuid.v1();
    var birthDateString = new Date(birthDate).toISOString().substring(0,10);
    var updatedAtString = String(Math.floor((new Date()).getTime()/1000));

    var dataEmail = {
		  Name : 'email',
		  Value : email
	  };
	  var dataFirstName = {
		  Name : 'given_name',
		  Value : firstName
	  };
	  var dataLastName = {
		  Name : 'family_name',
		  Value : lastName
	  };
	  var dataPhoneNumber = {
		  Name : 'phone_number',
		  Value : phoneNumber
	  };
	  var dataLocale = {
		  Name : 'locale',
		  Value : 'en-US'
	  };
	  var dataUpdatedAt = {
		  Name : 'updated_at',
		  Value : updatedAtString
	  };
	  var dataBirthDate = {
		  Name : 'birthdate',
		  Value : birthDateString
    };
	  
	  var attributeEmail = new CognitoUserAttribute(dataEmail);
	  var attributeFirstName = new CognitoUserAttribute(dataFirstName);
	  var attributeLastName = new CognitoUserAttribute(dataLastName);
	  var attributePhoneNumber = new CognitoUserAttribute(dataPhoneNumber);
	  var attributeLocale = new CognitoUserAttribute(dataLocale);
	  var attributeUpdatedAt = new CognitoUserAttribute(dataUpdatedAt);
	  var attributeBirthDate = new CognitoUserAttribute(dataBirthDate);
    
    attributeList.push(attributeEmail);
	  attributeList.push(attributeFirstName);
    attributeList.push(attributeLastName);
    attributeList.push(attributePhoneNumber);
    attributeList.push(attributeLocale);
    attributeList.push(attributeUpdatedAt);
    attributeList.push(attributeBirthDate);

	  return new Promise((resolve, reject) =>
		userPool.signUp(username, password, attributeList, null, (err, result) => {
		  if (err) {
			reject(err);
			return;
		  }

		  resolve(result.user);
		})
	  );
	}

	confirm(user, confirmationCode) {
	  return new Promise((resolve, reject) =>
		user.confirmRegistration(confirmationCode, true, function(err, result) {
		  if (err) {
			reject(err);
			return;
		  }
		  resolve(result);
		})
	  );
	}

	authenticate(user, email, password) {
	  const authenticationData = {
		Username: email,
		Password: password
	  };
	  const authenticationDetails = new AuthenticationDetails(authenticationData);

	  return new Promise((resolve, reject) =>
		user.authenticateUser(authenticationDetails, {
		  onSuccess: result => resolve(),
		  onFailure: err => reject(err)
		})
	  );
	}

  renderConfirmationForm() {
    return (
      <form onSubmit={this.handleConfirmationSubmit}>
        <FormGroup controlId="confirmationCode" bsSize="large">
          <ControlLabel>Confirmation Code</ControlLabel>
          <FormControl
            autoFocus
            type="tel"
            value={this.state.confirmationCode}
            onChange={this.handleChange}
          />
          <HelpBlock>Please check your Email inbox for the code.</HelpBlock>
        </FormGroup>
        <LoaderButton
          block
          bsSize="large"
          disabled={!this.validateConfirmationForm()}
          type="submit"
          isLoading={this.state.isLoading}
          text="Verify"
          loadingText="Verifying..."
        />
      </form>
    );
  }

  renderForm() {
    return (
      <form onSubmit={this.handleSubmit}>
        <FormGroup controlId="email" bsSize="large">
          <ControlLabel>Email</ControlLabel>
          <FormControl
            autoFocus
            type="email"
            value={this.state.email}
            onChange={this.handleChange}
          />
        </FormGroup>
        <FormGroup controlId="password" bsSize="large">
          <ControlLabel>Password</ControlLabel>
          <FormControl
            value={this.state.password}
            onChange={this.handleChange}
            type="password"
          />
        </FormGroup>
        <FormGroup controlId="confirmPassword" bsSize="large">
          <ControlLabel>Confirm Password</ControlLabel>
          <FormControl
            value={this.state.confirmPassword}
            onChange={this.handleChange}
            type="password"
          />
        </FormGroup>
        <FormGroup controlId="firstName" bsSize="large">
          <ControlLabel>First Name</ControlLabel>
          <FormControl
            value={this.state.firstName}
            onChange={this.handleChange}
            type="text"
          />
        </FormGroup>
        <FormGroup controlId="lastName" bsSize="large">
          <ControlLabel>Last Name</ControlLabel>
          <FormControl
            value={this.state.lastName}
            onChange={this.handleChange}
            type="text"
          />
        </FormGroup>
        <FormGroup controlId="phoneNumber" bsSize="large">
          <ControlLabel>Phone Number</ControlLabel>
          <Phone
              value={ this.state.phoneNumber }
              country="US"
              onChange={ phoneNumber => this.setState({ phoneNumber }) }
          />
        </FormGroup>
        <FormGroup controlId="birthDate" bsSize="large">
          <ControlLabel>Birth Date</ControlLabel>
          <Datetime
            timeFormat={false}
            value={ this.state.birthDate }
            dateFormat="YYYY-MM-DD"
            closeOnSelect="true"
            viewMode="years"
            onChange={ birthDate => this.setState({ birthDate }) }
          />
        </FormGroup>
        <LoaderButton
          block
          bsSize="large"
          disabled={!this.validateForm()}
          type="submit"
          isLoading={this.state.isLoading}
          text="Signup"
          loadingText="Signing up..."
        />
      </form>
    );
  }

  render() {
    return (
      <div className="Signup">
        {this.renderBanner()}
        {this.state.newUser === null
          ? this.renderForm()
          : this.renderConfirmationForm()}
      </div>
    );
  }
}