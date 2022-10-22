const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');

const Blog = require('../../models/Blog');
const User = require('../../models/User');

// @route    blog api/blogs
// @desc     Create a blog
// @access   Private
router.post(
  '/',
  [auth, [check('text', 'Text is required').not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select('-password');

      const newBlog = new Blog({
        text: req.body.text,
        firstname: user.firstname,
        lastname: user.lastname,
        avatar: user.avatar,
        user: req.user.id,
      });

        const blog = await newBlog.save();

        res.json(blog);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route    GET api/blogs
// @desc     Get all blogs
// @access   Private
router.get('/', auth, async (req, res) => {
  try {
    const Blogs = await Blog.find().sort({ date: -1 });
    res.json(Blogs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/blogs/:id
// @desc     Get blog by ID
// @access   Private
router.get('/:id', auth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    // Check for ObjectId format and blog
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/) || !blog) {
      return res.status(404).json({ msg: 'Blog not found' });
    }

    res.json(blog);
  } catch (err) {
    console.error(err.message);

    res.status(500).send('Server Error');
  }
});

// @route    DELETE api/blogs/:id
// @desc     Delete a blog
// @access   Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    // Check for ObjectId format and blog
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/) || !blog) {
      return res.status(404).json({ msg: 'Blog not found' });
    }

    // Check user
    if (blog.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await blog.remove();

    res.json({ msg: 'Blog removed' });
  } catch (err) {
    console.error(err.message);

    res.status(500).send('Server Error');
  }
});

// @route    PUT api/blogs/like/:id
// @desc     Like a blog
// @access   Private
router.put('/like/:id', auth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    // Check if the blog has already been liked
    if (
      blog.likes.filter((like) => like.user.toString() === req.user.id).length >
      0
    ) {
      return res.status(400).json({ msg: 'Blog already liked' });
    }

    blog.likes.unshift({ user: req.user.id });

    await blog.save();

    res.json(blog.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    PUT api/blogs/unlike/:id
// @desc     Unlike a blog
// @access   Private
router.put('/unlike/:id', auth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    // Check if the blog has already been liked
    if (
      blog.likes.filter((like) => like.user.toString() === req.user.id)
        .length === 0
    ) {
      return res.status(400).json({ msg: 'Blog has not yet been liked' });
    }

    // Get remove index
    const removeIndex = blog.likes
      .map((like) => like.user.toString())
      .indexOf(req.user.id);

    blog.likes.splice(removeIndex, 1);

    await blog.save();

    res.json(blog.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    POST api/blogs/comment/:id
// @desc     Comment on a blog
// @access   Private
router.post(
  '/comment/:id',
  [auth, [check('text', 'Text is required').not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select('-password');
      const blog = await Blog.findById(req.params.id);

      const newComment = {
        text: req.body.text,
        firstname: user.firstname,
        lastname: user.lastname,
        avatar: user.avatar,
        user: req.user.id,
      };

      blog.comments.unshift(newComment);

      await blog.save();

      res.json(blog.comments);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route    DELETE api/blogs/comment/:id/:comment_id
// @desc     Delete comment
// @access   Private
router.delete('/comment/:id/:comment_id', auth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    // Pull out comment
    const comment = blog.comments.find(
      (comment) => comment.id === req.params.comment_id
    );
    // Make sure comment exists
    if (!comment) {
      return res.status(404).json({ msg: 'Comment does not exist' });
    }
    // Check user
    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    blog.comments = blog.comments.filter(
      ({ id }) => id !== req.params.comment_id
    );

    await blog.save();

    return res.json(blog.comments);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

module.exports = router;