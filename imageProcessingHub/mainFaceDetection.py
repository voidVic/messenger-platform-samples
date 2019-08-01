'''
To execute run:
main.py

To input new user:
main.py --mode "input"

'''
import cv2
from imageProcessingHub.align_custom import AlignCustom
from imageProcessingHub.face_feature import FaceFeature
from imageProcessingHub.mtcnn_detect import MTCNNDetect
from imageProcessingHub.tf_graph import FaceRecGraph
from imageProcessingHub.moveMotor import MoveMotor

from imageProcessingHub.TGD import ObjectDetectionCamera

import argparse
import sys
import json
import numpy as np
import urllib.request as ur
import os
from random import *
from threading import Timer

mob_ip = "http://10.0.0.4:8080/shot.jpg"
trackingFlag = False
move_motor = MoveMotor()
trackingVideoName = ""
userFoundInTracker = "False"

def main(args):
    mode = args.mode
    if(mode == "camera"):
        camera_recog()
    elif( mode == "mobile"):
        ip_cam_recog()
    elif( mode == "stealth"):
        camera_recog_stealth()
    elif( mode == "file_input"):
        create_manual_data_read_img()
    elif mode == "input":
        create_manual_data()
    elif mode == "waitInput":
        waitForInput()
    else:
        raise ValueError("Unimplemented mode")

def setTrackingFlag(value):
    global trackingFlag
    trackingFlag = value
'''
Description:
Images from Video Capture -> detect faces' regions -> crop those faces and align them 
    -> each cropped face is categorized in 3 types: Center, Left, Right 
    -> Extract 128D vectors( face features)
    -> Search for matching subjects in the dataset based on the types of face positions. 
    -> The preexisitng face 128D vector with the shortest distance to the 128D vector of the face on screen is most likely a match
    (Distance threshold is 0.6, percentage threshold is 70%)
    
'''
def camera_recog_stealth():
    brk = False
    while True:
        print("[INFO] Turning On Camera (Bhai pls camera me dekho)")
        vs = cv2.VideoCapture(0) #get input from webcam
        output=[]
        output.append("xx--output--xx")
        while True:
            #with ur.urlopen(mob_ip) as imgResp:
            #    imgNp = np.array(bytearray(imgResp.read()), dtype=np.uint8)
            #    frame = cv2.imdecode(imgNp, -1)
            _,frame = vs.read()
            #u can certainly add a roi here but for the sake of a demo i'll just leave it as simple as this
            rects, landmarks = face_detect.detect_face(frame,80);#min face size is set to 80x80
            aligns = []
            positions = []
            for (i, rect) in enumerate(rects):
                aligned_face, face_pos = aligner.align(160,frame,landmarks[i])
                if len(aligned_face) == 160 and len(aligned_face[0]) == 160:
                    aligns.append(aligned_face)
                    positions.append(face_pos)
                else:
                    print("Align face failed") #log        
            if(len(aligns) > 0):
                features_arr = extract_feature.get_features(aligns)
                recog_data = findPeople(features_arr,positions)
                for (i,rect) in enumerate(rects):
                    imgName = str(randint(1, 1000))+'.jpg'
                    cv2.imwrite(os.path.abspath('/Users/ASHARM214/Desktop/backup/AnkitGIT/messengerBot/messenger-platform-samples/detectedImages/'+imgName), frame[rect[1]: rect[1]+rect[3], rect[0]: rect[0] + rect[2]])
                    imgObj = {}
                    imgObj["name"] = imgName
                    imgObj["conf"] = recog_data[i][1]
                    imgObj["who"] = recog_data[i][0]
                    imgObj["what"] = "whoIsAtDoor"

                    output.append(imgObj)
                    #cv2.rectangle(frame,(rect[0],rect[1]),(rect[0] + rect[2],rect[1]+rect[3]),(5,255,5), 2) #draw bounding box for the face
                    #cv2.putText(frame,recog_data[i][0]+" - "+str(recog_data[i][1])+"%",(rect[0],rect[1]-10),cv2.FONT_HERSHEY_SIMPLEX ,1,(255,255,255),1,cv2.LINE_AA)
                vs.release()
                print(output)
                brk = True
                break
        if brk: break


def startTracking(name):
    global trackingFlag
    global trackingVideoName
    global userFoundInTracker
    print("[INFO] please look into moving camera <(*.*)> ")
    vs = cv2.VideoCapture(1) #get input from webcam
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    videoName = str(randint(1, 1000))+'.mp4'
    trackingVideoName = videoName
    tempRect, tempFrame = vs.read()
    frameHeight, frameWidth = tempFrame.shape[:2]
    print(frameHeight, frameWidth)
    out = cv2.VideoWriter('./outputVid/'+videoName, fourcc, 20.0, (1024, 768))
    while trackingFlag:
        #with ur.urlopen(mob_ip) as imgResp:
        #    imgNp = np.array(bytearray(imgResp.read()), dtype=np.uint8)
        #    frame = cv2.imdecode(imgNp, -1)
        _,frame = vs.read()
        #u can certainly add a roi here but for the sake of a demo i'll just leave it as simple as this
        rects, landmarks = face_detect.detect_face(frame,80);#min face size is set to 80x80
        aligns = []
        positions = []
        for (i, rect) in enumerate(rects):
            aligned_face, face_pos = aligner.align(160,frame,landmarks[i])
            if len(aligned_face) == 160 and len(aligned_face[0]) == 160:
                aligns.append(aligned_face)
                positions.append(face_pos)
            else: 
                print("Align face failed") #log        
        if(len(aligns) > 0):
            features_arr = extract_feature.get_features(aligns)
            recog_data = findPeople(features_arr,positions)
            for (i,rect) in enumerate(rects):
                recognizedPerson = recog_data[i][0].lower()
                if name == recognizedPerson:
                    userFoundInTracker = "True"
                    xCoord = rect[0] + rect[2]/2
                    if xCoord < frameWidth/3:
                        move_motor.clockWise()
                    if xCoord > frameWidth*2/3:
                        move_motor.antiClockWise()
                cv2.rectangle(frame,(rect[0],rect[1]),(rect[0] + rect[2],rect[1]+rect[3]),(5,255,5), 2) #draw bounding box for the face
                cv2.putText(frame,recog_data[i][0]+" - "+str(recog_data[i][1])+"%",(rect[0],rect[1]-10),cv2.FONT_HERSHEY_SIMPLEX ,1,(255,255,255),1,cv2.LINE_AA)
        out.write(frame)
        #cv2.imshow('detection', frame)
    vs.release()
    out.release()



def scanPeople():
    print("[INFO] Turning On Camera (Bhai pls camera me dekho)")
    vs = cv2.VideoCapture(0) #get input from webcam
    output=[]
    output.append("xx--output--xx")
    left = 0
    right = 0
    threshhold = 20
    while left<threshhold or right<threshhold*2:
        if left<threshhold:
            move_motor.antiClockWise()
            left = left+1
        if left>=threshhold and right < threshhold*2:
            move_motor.clockWise()
            right = right+1
        #with ur.urlopen(mob_ip) as imgResp:
        #    imgNp = np.array(bytearray(imgResp.read()), dtype=np.uint8)
        #    frame = cv2.imdecode(imgNp, -1)
        _,frame = vs.read()
        #u can certainly add a roi here but for the sake of a demo i'll just leave it as simple as this
        rects, landmarks = face_detect.detect_face(frame,80);#min face size is set to 80x80
        aligns = []
        positions = []
        for (i, rect) in enumerate(rects):
            aligned_face, face_pos = aligner.align(160,frame,landmarks[i])
            if len(aligned_face) == 160 and len(aligned_face[0]) == 160:
                aligns.append(aligned_face)
                positions.append(face_pos)
            else:
                print("Align face failed") #log        
        if(len(aligns) > 0):
            features_arr = extract_feature.get_features(aligns)
            recog_data = findPeople(features_arr,positions)
            for (i,rect) in enumerate(rects):
                imgName = str(randint(1, 1000))+'.jpg'
                cv2.imwrite(os.path.abspath('/Users/ASHARM214/Desktop/backup/AnkitGIT/messengerBot/messenger-platform-samples/detectedImages/'+imgName), frame[rect[1]: rect[1]+rect[3], rect[0]: rect[0] + rect[2]])
                imgObj = {}
                imgObj["name"] = imgName
                imgObj["conf"] = recog_data[i][1]
                imgObj["who"] = recog_data[i][0]
                imgObj["what"] = "whoIsAtDoor"

                output.append(imgObj)
                #cv2.rectangle(frame,(rect[0],rect[1]),(rect[0] + rect[2],rect[1]+rect[3]),(5,255,5), 2) #draw bounding box for the face
                #cv2.putText(frame,recog_data[i][0]+" - "+str(recog_data[i][1])+"%",(rect[0],rect[1]-10),cv2.FONT_HERSHEY_SIMPLEX ,1,(255,255,255),1,cv2.LINE_AA)
            #vs.release()
    print(output)
    vs.release()



def ip_cam_recog():
    print("[INFO] please look into thr connected mobile device <(O_o)> ")
    #vs = cv2.VideoCapture(1); #get input from webcam
    fourcc = cv2.VideoWriter_fourcc(*'XVID')
    out = cv2.VideoWriter('./outputVid/recognized.avi', fourcc, 20.0, (640, 480))
    while True:
        #imgResp = urllib.urlopen(mob_ip)
        with ur.urlopen(mob_ip) as imgResp:
            imgNp = np.array(bytearray(imgResp.read()), dtype=np.uint8)
            frame = cv2.imdecode(imgNp, -1)
        #_,frame = vs.read();
        #u can certainly add a roi here but for the sake of a demo i'll just leave it as simple as this
        rects, landmarks = face_detect.detect_face(frame,80);#min face size is set to 80x80
        aligns = []
        positions = []
        for (i, rect) in enumerate(rects):
            aligned_face, face_pos = aligner.align(160,frame,landmarks[i])
            if len(aligned_face) == 160 and len(aligned_face[0]) == 160:
                aligns.append(aligned_face)
                positions.append(face_pos)
            else: 
                print("Align face failed") #log        
        if(len(aligns) > 0):
            features_arr = extract_feature.get_features(aligns)
            recog_data = findPeople(features_arr,positions);
            for (i,rect) in enumerate(rects):
                cv2.rectangle(frame,(rect[0],rect[1]),(rect[0] + rect[2],rect[1]+rect[3]),(5,255,5), 2) #draw bounding box for the face
                cv2.putText(frame,recog_data[i][0]+" - "+str(recog_data[i][1])+"%",(rect[0],rect[1]-10),cv2.FONT_HERSHEY_SIMPLEX ,1,(255,255,255),1,cv2.LINE_AA)

        cv2.imshow("Frame",frame)
        out.write(frame)
        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            break





def camera_recog():
    print("[INFO] Turning On Camera (Bhai pls camera me dekho)")
    vs = cv2.VideoCapture(1); #get input from webcam
    fourcc = cv2.VideoWriter_fourcc(*'XVID')
    out = cv2.VideoWriter('./outputVid/recognized.avi', fourcc, 20.0, (640, 480))
    while True:
        _,frame = vs.read();
        #u can certainly add a roi here but for the sake of a demo i'll just leave it as simple as this
        rects, landmarks = face_detect.detect_face(frame,80);#min face size is set to 80x80
        aligns = []
        positions = []
        for (i, rect) in enumerate(rects):
            aligned_face, face_pos = aligner.align(160,frame,landmarks[i])
            if len(aligned_face) == 160 and len(aligned_face[0]) == 160:
                aligns.append(aligned_face)
                positions.append(face_pos)
            else: 
                print("Align face failed") #log        
        if(len(aligns) > 0):
            features_arr = extract_feature.get_features(aligns)
            recog_data = findPeople(features_arr,positions);
            for (i,rect) in enumerate(rects):
                cv2.rectangle(frame,(rect[0],rect[1]),(rect[0] + rect[2],rect[1]+rect[3]),(5,255,5), 2) #draw bounding box for the face
                cv2.putText(frame,recog_data[i][0]+" - "+str(recog_data[i][1])+"%",(rect[0],rect[1]-10),cv2.FONT_HERSHEY_SIMPLEX ,1,(255,255,255),1,cv2.LINE_AA)

        cv2.imshow("Frame",frame)
        out.write(frame)
        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            break
    vs.release()
'''
facerec_128D.txt Data Structure:
{
"Person ID": {
    "Center": [[128D vector]],
    "Left": [[128D vector]],
    "Right": [[128D Vector]]
    }
}
This function basically does a simple linear search for 
^the 128D vector with the min distance to the 128D vector of the face on screen
'''
def findPeople(features_arr, positions, thres = 0.6, percent_thres = 70):
    '''
    :param features_arr: a list of 128d Features of all faces on screen
    :param positions: a list of face position types of all faces on screen
    :param thres: distance threshold
    :return: person name and percentage
    '''
    f = open('./facerec_128D.txt','r')
    data_set = json.loads(f.read());
    returnRes = [];
    for (i,features_128D) in enumerate(features_arr):
        result = "Unknown";
        smallest = sys.maxsize
        for person in data_set.keys():
            person_data = data_set[person][positions[i]];
            for data in person_data:
                distance = np.sqrt(np.sum(np.square(data-features_128D)))
                if(distance < smallest):
                    smallest = distance;
                    result = person;
        percentage =  min(100, 100 * thres / smallest)
        if percentage <= percent_thres :
            result = "Unknown"
        returnRes.append((result,percentage))
    return returnRes

'''
Description:
User input his/her name or ID -> Images from Video Capture -> detect the face -> crop the face and align it 
    -> face is then categorized in 3 types: Center, Left, Right 
    -> Extract 128D vectors( face features)
    -> Append each newly extracted face 128D vector to its corresponding position type (Center, Left, Right)
    -> Press Q to stop capturing
    -> Find the center ( the mean) of those 128D vectors in each category. ( np.mean(...) )
    -> Save
    
'''
def create_manual_data():
    vs = cv2.VideoCapture(1); #get input from webcam
    
    print("Please input new user ID:")
    new_name = input(); #ez python input()
    f = open('./facerec_128D.txt','r');
    data_set = json.loads(f.read());
    person_imgs = {"Left" : [], "Right": [], "Center": []};
    person_features = {"Left" : [], "Right": [], "Center": []};
    print("Please start turning slowly. Press 'q' to save and add this new user to the dataset");
    while True:
        _, frame = vs.read();
        rects, landmarks = face_detect.detect_face(frame, 80);  # min face size is set to 80x80
        for (i, rect) in enumerate(rects):
            aligned_frame, pos = aligner.align(160,frame,landmarks[i]);
            if len(aligned_frame) == 160 and len(aligned_frame[0]) == 160:
                person_imgs[pos].append(aligned_frame)
                cv2.imshow("Captured face", aligned_frame)
        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            break

    for pos in person_imgs: #there r some exceptions here, but I'll just leave it as this to keep it simple
        person_features[pos] = [np.mean(extract_feature.get_features(person_imgs[pos]),axis=0).tolist()]
    data_set[new_name] = person_features;
    f = open('./facerec_128D.txt', 'w');
    f.write(json.dumps(data_set))



def create_manual_data_read_img():
    #vs = cv2.VideoCapture(0); #get input from webcam
    images = load_images_from_folder();
    print("#############  Total Images   ####################")
    print(len(images))
    #print("Please input new user ID:")
    new_name = "Sridhar" # input(); #ez python input()
    f = open('./facerec_128D.txt','r');
    data_set = json.loads(f.read());
    person_imgs = {"Left" : [], "Right": [], "Center": []};
    person_features = {"Left" : [], "Right": [], "Center": []};
    # print("Please start turning slowly. Press 'q' to save and add this new user to the dataset");
    for frame in images:
        #_, frame = vs.read();

        rects, landmarks = face_detect.detect_face(frame, 80);  # min face size is set to 80x80
        for (i, rect) in enumerate(rects):
            aligned_frame, pos = aligner.align(160,frame,landmarks[i]);
            if len(aligned_frame) == 160 and len(aligned_frame[0]) == 160:
                person_imgs[pos].append(aligned_frame)
                cv2.imshow("Captured face", aligned_frame)
        

    for pos in person_imgs: #there r some exceptions here, but I'll just leave it as this to keep it simple
        person_features[pos] = [np.mean(extract_feature.get_features(person_imgs[pos]),axis=0).tolist()]
    data_set[new_name] = person_features;
    f = open('./facerec_128D.txt', 'w');
    f.write(json.dumps(data_set))
    print("############### Training completed ###################")

def load_images_from_folder():
    folder = "C:\AnkitGIT\FaceRec\input\sridhar"
    images = []
    for filename in os.listdir(folder):
        img = cv2.imread(os.path.join(folder,filename))
        if img is not None:
            images.append(img)
    return images

def stopTracker():
    print("ReceivedCommandToEndTracking")
    global trackingVideoName
    global userFoundInTracker
    setTrackingFlag(False)
    outputVid = []
    outputVid.append("xx--output--xx")
    vidObj = {}
    vidObj["what"] = "tracking"
    vidObj["name"] = trackingVideoName
    vidObj["userFound"] = userFoundInTracker
    outputVid.append(vidObj)
    print(outputVid)


def waitForInput():
    while True:
        print("xx--give--command123--xx")
        dummyInput = input()
        if dummyInput == "q":
            break
        elif dummyInput == "whoIsAtDoor":
            camera_recog_stealth()
        elif dummyInput =="scanPeople":
            scanPeople()
        else:
            ipSplit = dummyInput.split("::")
            if ipSplit[0] == "track":
                print(ipSplit)
                setTrackingFlag(True)
                Timer(float(ipSplit[2]), stopTracker).start()
                startTracking(ipSplit[1])
            if ipSplit[0] == "detect":
                ObjectDetectionCamera.detect_threat()

waitForInput()            




#if __name__ == '__main__':
parser = argparse.ArgumentParser()
parser.add_argument("--mode", type=str, help="Run camera recognition", default="waitInput")
args = parser.parse_args(sys.argv[1:])
FRGraph = FaceRecGraph()
aligner = AlignCustom()
extract_feature = FaceFeature(FRGraph)
face_detect = MTCNNDetect(FRGraph, scale_factor=1); #scale_factor, rescales image for faster detection
main(args)
