// Footer.jsx
import React from 'react';
import styled from 'styled-components';

const FooterContainer = styled.footer`
  position: fixed;
  bottom: 0;
  left: 0;
  padding: 12px 24px;
  background-color: rgba(26, 26, 26, 0.95);
  color: #ffffff;
  font-size: 14px;
  z-index: 1000;
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  border-top-left-radius: 14px;
  border-top-right-radius: 14px;
  box-shadow:
    0 -2px 10px rgba(0, 102, 255, 0.6),
    0 -4px 20px rgba(255, 204, 0, 0.4);
  transition: all 0.3s ease-in-out;

  @media (max-width: 600px) {
    font-size: 12px;
    padding: 10px 16px;
  }
`;

const FooterLink = styled.a`
  color: #3399ff;
  font-weight: bold;
  text-decoration: none;
  margin-left: 4px;
  transition: color 0.3s ease;

  &:hover {
    color: #ffcc00;
    text-decoration: underline;
  }
`;

const Footer = () => {
  return (
    <FooterContainer>
      © All Rights Reserved to
      <FooterLink
        href="https://in.linkedin.com/in/bonthavijay"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Visit Bontha Vijay's LinkedIn profile"
      >
        Bontha Vijay
      </FooterLink>{' '}
      2025
    </FooterContainer>
  );
};

export default Footer;
