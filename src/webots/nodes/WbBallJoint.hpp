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

class WbAnchorParameter;
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
  void updateOdeWorldCoordinates() override;
  WbAnchorParameter *anchorParameter() const;
  WbBallJointParameters *ballJointParameters() const;

  void computeEndPointSolidPositionFromParameters(WbVector3 &translation, WbRotation &rotation) const override {
    assert(false);
  };

  WbMotor *motor3() const;
  WbPositionSensor *positionSensor3() const;
  WbBrake *brake3() const;

public slots:
  bool setJoint() override;

protected:
  WbMFNode *mDevice3;  // JointDevices: logical position sensor device, a motor and brake, only one per type is allowed
  double mOdePositionOffset3;
  double mPosition3;  // Keeps track of the joint position3 if JointParameters3 don't exist.

  WbVector3 anchor() const override;  // defaults to the center of the Solid parent, i.e. (0, 0, 0) in relative coordinates
  void applyToOdeSpringAndDampingConstants(dBodyID body, dBodyID parentBody) override;
  void updateEndPointZeroTranslationAndRotation() override {}  // not used by ball joint

protected slots:
  void updateParameters() override;
  void updateAnchor() override;
  void updateJointAxisRepresentation() override;

private:
  WbSFNode *mParameters3;
  double mInitialPosition3;
  void setOdeJoint(dBodyID body, dBodyID parentBody) override;
  void applyToOdeAnchor();
  void init();
};

#endif
