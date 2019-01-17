// Copyright 1996-2018 Cyberbotics Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Implemented node class representing a ball-and-socket joint (3 angular DOF)

#ifndef WB_BALL_JOINT_HPP
#define WB_BALL_JOINT_HPP

class WbBallJointParameters;
class WbVector3;

#include <cassert>
#include "WbHinge2Joint.hpp"

class WbBallJoint : public WbHinge2Joint {
  Q_OBJECT

public:
  virtual ~WbBallJoint();
  explicit WbBallJoint(WbTokenizer *tokenizer = NULL);
  WbBallJoint(const WbBallJoint &other);
  explicit WbBallJoint(const WbNode &other);
  void createWrenObjects() override;
  void preFinalize() override;
  void postFinalize() override;
  int nodeType() const override { return WB_NODE_BALL_JOINT; }
  void prePhysicsStep(double ms) override;
  void postPhysicsStep() override;
  void reset() override;
  void save() override;
  QVector<WbLogicalDevice *> devices() const override;
  bool resetJointPositions() override;
  void setPosition(double position, int index = 1) override;
  double position(int index = 1) const override;
  double initialPosition(int index = 1) const override;
  WbBallJointParameters *ballJointParameters() const;
  WbJointParameters *parameters3() const override;
  void computeEndPointSolidPositionFromParameters(WbVector3 &translation, WbRotation &rotation) const override;
  WbMotor *motor3() const;
  WbPositionSensor *positionSensor3() const;
  WbBrake *brake3() const;
  WbJointDevice *device3(int index) const;
  virtual int devices3Number() const;

  WbVector3 axis() const override { return WbVector3(1.0, 0.0, 0.0); }

public slots:
  bool setJoint() override;

protected:
  WbVector3 axis2() const override { return WbVector3(0.0, 1.0, 0.0); }
  WbVector3 axis3() const { return WbVector3(0.0, 0.0, 1.0); }
  WbMFNode *mDevice3;  // JointDevices: logical position sensor device, a motor and brake, only one per type is allowed
  double mOdePositionOffset3;
  double mPosition3;  // Keeps track of the joint position3 if JointParameters3 don't exist.
  bool mSpringAndDampingConstantsAxis3On;  // defines if there is spring and dampingConstant along this axis

  WbVector3 anchor() const override;  // defaults to the center of the Solid parent, i.e. (0, 0, 0) in relative coordinates
  void applyToOdeSpringAndDampingConstants(dBodyID body, dBodyID parentBody) override;
  void updateOdePositionOffset() override;
  void updateEndPointZeroTranslationAndRotation() override {}  // not used by ball joint
  void updatePosition(double position) override;
  void updatePositions(double position, double position2, double position3);

protected slots:
  virtual void addDevice3(int index);
  void updateParameters() override;
  void updatePosition() override;
  void updateJointAxisRepresentation() override;

private:
  WbRotationalMotor *rotationalMotor3() const;
  void updateParameters3();
  WbSFNode *mParameters3;
  double mInitialPosition3;
  void applyToOdeAxis() override;
  void applyToOdeMinAndMaxStop() override;
  void init();
  double computeAngleRate(int index) const;
};

#endif
