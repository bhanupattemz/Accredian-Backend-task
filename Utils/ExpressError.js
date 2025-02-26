class ExpressError extends Error{
    constructor(msg,status){
        super(msg)
        this.message=msg,
        this.statusCode=status
    }
}

module.exports=ExpressError