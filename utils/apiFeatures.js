class APIFeatures {
    constructor(query, queryString) {
        // mongoose query and the query we get from express (route)
        this.query = query;
        this.queryString = queryString;
    }

    filter() {
        const queryObj = { ...this.queryString };
        // creating new copy of req.query and this 3 point takes all the field out of the object

        const excludedFields = ["page", "sort", "limit", "fields"];
        // now we exclude the fields out of the query parameters
        excludedFields.forEach((el) => delete queryObj[el]);

        // converting object to string
        let queryStr = JSON.stringify(queryObj);

        // callback gets the keywords and puts the $ top of it
        // so that query becomes mongoose logical operators and we use
        queryStr = queryStr.replace(
            /\b(gte|gt|lte|lt)\b/g,
            (match) => `$${match}`
        );

        this.query = this.query.find(JSON.parse(queryStr));

        return this;
    }
    sort() {
        if (this.queryString.sort) {
            // getting input with commas like this  &sort=price,duration
            const sortBy = this.queryString.sort.split(",").join(" ");
            // letting go with the spaces which mongoose understand
            // so that we can sort by second criteria in a group
            this.query = this.query.sort(sortBy);
        } else {
            this.query = this.query.sort("-createdAt");
            // newest one appears first
        }
        return this;
    }

    limitFields() {
        if (this.queryString.fields) {
            const fields = this.queryString.fields.split(",").join(" ");
            this.query = this.query.select(fields);
        } else {
            this.query = this.query.select("-__v");
            // by adding - to the top of the __v we are excluding it from response. __v is sth mongoose uses internally thats it
        }
        return this;
    }
    paginate() {
        const page = this.queryString.page * 1 || 1;
        const limit = this.queryString.limit * 1 || 100;
        // converting string to the integer, defining 1 to default
        const skip = (page - 1) * limit;
        this.query = this.query.skip(skip).limit(limit);

        // 3. sayfa 20 li arama https://www.sahibinden.com/satilik/ankara-beypazari?pagingOffset=40&price_min=5000&a24_min=50&price_max=10000000000
        // 2. sayfa 20 li arama https://www.sahibinden.com/satilik/ankara-beypazari?pagingOffset=20&price_min=5000&a24_min=50&price_max=10000000000
        // 1. sayfa 20 li https://www.sahibinden.com/satilik/ankara-beypazari?price_min=5000&a24_min=50&price_max=10000000000
        return this;
    }
}
module.exports = APIFeatures;
