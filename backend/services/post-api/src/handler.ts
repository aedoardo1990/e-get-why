import {Request, Response} from "express";
import { docClient } from "../../../lib/dynamoClient";
import { v1 as uuidv1 } from 'uuid';
import { BatchGetCommand, BatchWriteCommand, GetCommand, PutCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { buildResponse } from "../../../lib/responseUtils";

export const createPost = async (req: Request, res: Response) => {
  const { userId, content, hashtags, categoryID, isAnonymous } = req.body;
  const timestamp = new Date().toISOString();

  if (!userId || !content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const postId = uuidv1();

  // Concatenate hashtags into a single string
  const hashtagsString = hashtags.join(', ');

  const postUserId = isAnonymous ? 'ANONYMOUS' : userId;

  const postParams = {
    TableName: process.env.POSTS_TABLE!,
    Item: {
      PostID: postId,
      UserID: postUserId,
      Content: content,
      Hashtags: hashtagsString,
      CategoryID: categoryID || null,
      IsAnonymous: isAnonymous || false,
      CreatedAt: timestamp,
      UpdatedAt: timestamp,
    },
  };

  const hashtagItems = hashtags.map((hashtag: string) => ({
    PutRequest: {
      Item: {
        Hashtag: hashtag,
        PostID: postId,
      },
    },
  }));

  const hashtagParams = {
    RequestItems: {
      [process.env.POSTHASHTAGS_TABLE!]: hashtagItems,
    },
  };

  try {
    const postCommand = new PutCommand(postParams);
    await docClient.send(postCommand);

    if (hashtagItems.length > 0) {
      const hashtagCommand = new BatchWriteCommand(hashtagParams);
      await docClient.send(hashtagCommand);
    }

    res.status(201).json(buildResponse(postParams.Item));
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json(buildResponse(null, { error: `Error creating post: ${error.message}` }));
    } else {
      res.status(500).json(buildResponse(null, { error: 'Unknown error occurred' }));
    }
  }
};

export const getAllPosts = async (req: Request, res: Response) => {
  const params = {
    TableName: process.env.POSTS_TABLE!,
  };

  try {
    const command = new ScanCommand(params);
    const data = await docClient.send(command);
    res.status(200).json(buildResponse(data.Items));
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json(buildResponse(null, { error: `Error getting posts: ${error.message}` }));
    } else {
      res.status(500).json(buildResponse(null, { error: 'Unknown error occurred' }));
    }
  }
};

export const getPostById = async (req: Request, res: Response) => {
  const { postId } = req.params;

  const params = {
    TableName: process.env.POSTS_TABLE!,
    Key: {
      PostID: postId
    }
  };

  try {
    const command = new GetCommand(params);
    const data = await docClient.send(command);
    if (data.Item) {
      res.status(200).json(buildResponse(data.Item));
    } else {
      res.status(404).json(buildResponse(null, { error: "Post not found" }));
    }
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json(buildResponse(null, { error: `Error getting post: ${error.message}` }));
    } else {
      res.status(500).json(buildResponse(null, { error: 'Unknown error occurred' }));
    }
  }
};

export const getPostByHashtag = async (req: Request, res: Response) => {
  let { hashtag } = req.params;

  if (!hashtag.startsWith('#')) {
    hashtag = `#${hashtag}`;
  }

  const POSTHASHTAGS_TABLE = process.env.POSTHASHTAGS_TABLE;
  const POSTS_TABLE = process.env.POSTS_TABLE;

  if (!POSTHASHTAGS_TABLE || !POSTS_TABLE) {
    return res.status(500).json({ data: null, meta: { error: "Environment variables not set correctly" } });
  }

  const params = {
    TableName: POSTHASHTAGS_TABLE,
    KeyConditionExpression: 'Hashtag = :hashtag',
    ExpressionAttributeValues: {
      ':hashtag': hashtag,
    },
  };

  try {
    const command = new QueryCommand(params);
    const data = await docClient.send(command);

    const postIds = data.Items?.map(item => item.PostID);

    if (postIds && postIds.length > 0) {
      const keys = postIds.map(postId => ({ PostID: postId }));
      const postsParams = {
        RequestItems: {
          [POSTS_TABLE]: {
            Keys: keys,
          },
        },
      };
      const postsCommand = new BatchGetCommand(postsParams);
      const postsData = await docClient.send(postsCommand);

      res.status(200).json({ data: postsData.Responses?.[POSTS_TABLE] || [], meta: {} });
    } else {
      res.status(200).json(buildResponse([], { message: "No posts found for the given hashtag." }));
    }
  } catch (error) {
    console.error("Error getting posts by hashtag:", error);
    res.status(500).json(buildResponse(null, { error: 'Unknown error occurred' }));
  }
};



export const addComment = async (req: Request, res: Response) => {
  const { postId } = req.params;
  const { userId, content } = req.body;
  const  timestamp = new Date().toISOString();

  if (!userId || !content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const params = {
    TableName: process.env.COMMENTS_TABLE!,
    Item: {
      CommentID: uuidv1(),
      PostID: postId,
      UserID: userId,
      Content: content,
      CreatedAt: timestamp,
      UpdatedAt: timestamp,
    },
  };

  try {
    const command = new PutCommand(params);
    await docClient.send(command);
    res.status(201).json(buildResponse(params.Item));
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json(buildResponse(null, { error: `Error adding comment: ${error.message}` }));
    } else {
      res.status(500).json(buildResponse(null, { error: 'Unknown error occurred' }));
    }
  }
};

export const likePost = async (req: Request, res: Response) => {
  const { postId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const params = {
    TableName: process.env.LIKES_TABLE!,
    Item: {
      LikeID: uuidv1(),
      PostID: postId,
      UserID: userId,
    },
  };
  try {
    const command = new PutCommand(params);
    await docClient.send(command);
    res.status(201).json(buildResponse(params.Item));
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json(buildResponse(null, { error: `Error liking post: ${error.message}` }));
    } else {
      res.status(500).json(buildResponse(null, { error: 'Unknown error occurred' }));
    }
  }
};